import * as t from '@babel/types';

import type { Expression, LVal, MemberExpression } from '@babel/types';
import type { BunchOf } from 'types';

export type { NodePath as Path, Scope, VisitNodeObject } from '@babel/traverse';
export { Program as BabelProgram } from '@babel/types';
export * from '@babel/types';

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

type OP = typeof COMPARE_OP[number];

const COMPARE_OP = <const>["==", "===", "!==", "in", "instanceof", ">", "<", ">=", "<="];
const OP_POSITES = new Map<OP, OP>();

[["==", "!="],["===", "!=="],[">", "<="],["<", ">="]].forEach(([a, b]) => {
  OP_POSITES.set(a as OP, b as OP);
})

export function isBinaryAssertion(a: Expression): a is t.BinaryExpression {
  if(t.isBinaryExpression(a))
    if(COMPARE_OP.includes(a.operator as any))
      return true;

  return false;
}

export function inverseExpression(x: t.BinaryExpression){
  const inverse = OP_POSITES.get(x.operator as any);
  
  if(inverse)
    return t.binaryExpression(inverse, x.left, x.right);
  else
    throw new Error(`Can't invert binary comparison ${x.operator}.`);
  
  return x;
}