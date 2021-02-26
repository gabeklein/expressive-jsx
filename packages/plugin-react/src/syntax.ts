import {
  callExpression,
  identifier,
  memberExpression,
  numericLiteral,
  objectExpression,
  objectProperty,
  stringLiteral,
  templateElement,
  templateLiteral,
  thisExpression,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';

import type { Expression, LVal, MemberExpression } from '@babel/types';
import type { BunchOf } from 'types';

export function _object(
  obj: BunchOf<Expression | false | undefined> = {}){

  const properties = [];

  for(const x in obj)
    if(obj[x])
      properties.push(
        objectProperty(
          identifier(x),
          obj[x] as Expression
        )
      )

  return objectExpression(properties);
}

export function _get(
  object: string | Expression,
  ...path: (string | number)[] ){

  if(object == "this")
    object = thisExpression()

  if(typeof object == "string")
    path = [...object.split("."), ...path]

  for(const member of path){
    let select;

    if(typeof member == "string"){
      select = /^[A-Za-z0-9$_]+$/.test(member)
        ? identifier(member)
        : stringLiteral(member);
    }
    else if(typeof member == "number")
      select = numericLiteral(member);
    else
      throw new Error("Bad member id, only strings and numbers are allowed")

    object = typeof object == "object"
      ? memberExpression(object, select, select!.type !== "Identifier")
      : select;
  }

  return object as MemberExpression;
}

export function _call(
  callee: Expression,
  ...args: Expression[]
){
  return callExpression(callee, args)
}

export function _require(from: string){
  const argument = 
    typeof from == "string"
      ? stringLiteral(from)
      : from

  return callExpression(
    identifier("require"), [argument]
  )
}

export function _declare(
  type: "const" | "let" | "var",
  id: LVal,
  init?: Expression ){

  return (
    variableDeclaration(type, [
      variableDeclarator(id, init)
    ])
  )
}

export function _objectAssign(
  ...objects: Expression[]){

  return callExpression(
    _get("Object.assign"),
    objects
  )
}

export function _objectKeys(
  object: Expression){

  return _call(
    _get("Object.keys"),
    object
  )
}

export function _template(text: string){
  return (
    templateLiteral([
      templateElement({ raw: text, cooked: text }, true)
    ], [])
  )
}