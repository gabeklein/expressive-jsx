import * as t from '@babel/types';

import type { Expression, LVal, MemberExpression } from '@babel/types';
import type { BunchOf } from 'types';

export function object(
  obj: BunchOf<Expression | false | undefined> = {}){

  const properties = [];

  for(const x in obj)
    if(obj[x])
      properties.push(
        t.objectProperty(
          t.identifier(x),
          obj[x] as Expression
        )
      )

  return t.objectExpression(properties);
}

export function get(
  object: string | Expression,
  ...path: (string | number)[] ){

  if(object == "this")
    object = t.thisExpression()

  if(typeof object == "string")
    path = [...object.split("."), ...path]

  for(const member of path){
    let select;

    if(typeof member == "string"){
      select = /^[A-Za-z0-9$_]+$/.test(member)
        ? t.identifier(member)
        : t.stringLiteral(member);
    }
    else if(typeof member == "number")
      select = t.numericLiteral(member);
    else
      throw new Error("Bad member id, only strings and numbers are allowed")

    object = typeof object == "object"
      ? t.memberExpression(object, select, select!.type !== "Identifier")
      : select;
  }

  return object as MemberExpression;
}

export function call(
  callee: Expression,
  ...args: Expression[]
){
  return t.callExpression(callee, args)
}

export function require(from: string){
  const argument = 
    typeof from == "string"
      ? t.stringLiteral(from)
      : from

  return t.callExpression(
    t.identifier("require"), [argument]
  )
}

export function declare(
  type: "const" | "let" | "var",
  id: LVal,
  init?: Expression ){

  return (
    t.variableDeclaration(type, [
      t.variableDeclarator(id, init)
    ])
  )
}

export function objectAssign(
  ...objects: Expression[]){

  return t.callExpression(
    get("Object.assign"),
    objects
  )
}

export function objectKeys(object: Expression){
  return call(
    get("Object.keys"),
    object
  )
}

export function template(text: string){
  return (
    t.templateLiteral([
      t.templateElement({ raw: text, cooked: text }, true)
    ], [])
  )
}