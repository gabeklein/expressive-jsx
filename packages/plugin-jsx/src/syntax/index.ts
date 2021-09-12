import * as t from '@babel/types';

import { literal } from './construct';

import type { BunchOf } from 'types';

export type { NodePath as Path, Scope, VisitNodeObject } from '@babel/traverse';
export type { Program as BabelProgram } from '@babel/types';
export * from '@babel/types';
export * from './assertion';
export * from './construct';

const IdentifierType = /(Expression|Literal|Identifier|JSXElement|JSXFragment|Import|Super|MetaProperty|TSTypeAssertion)$/;

export function isExpression(node: any): node is t.Expression {
  return typeof node == "object" && IdentifierType.test(node.type);
}

export function object(
  obj: BunchOf<t.Expression | false | undefined> = {}){

  const properties = [];

  for(const [key, value] of Object.entries(obj)){
    if(!value)
      continue;

    properties.push(
      t.objectProperty(t.identifier(key), value)
    )
  }

  return t.objectExpression(properties);
}

export function get(object: "this"): t.ThisExpression;
export function get<T extends t.Expression> (object: T): T;
export function get(object: string | t.Expression, ...path: (string | number)[]): t.MemberExpression;
export function get(object: string | t.Expression, ...path: (string | number)[]){
  if(object == "this")
    object = t.thisExpression()

  if(typeof object == "string")
    path = [...object.split("."), ...path]

  for(const member of path){
    let select;

    if(typeof member == "string"){
      select = /^[A-Za-z0-9$_]+$/.test(member)
        ? t.identifier(member)
        : literal(member);
    }
    else if(typeof member == "number")
      select = literal(member);
    else
      throw new Error("Bad member id, only strings and numbers are allowed")

    object = typeof object == "object"
      ? t.memberExpression(object, select, select!.type !== "Identifier")
      : select;
  }

  return object as t.Expression;
}

export function call(callee: t.Expression | string, ...args: t.Expression[]){
  if(typeof callee == "string")
    callee = get(callee);

  return t.callExpression(callee, args)
}

export function require(from: string){
  return call("require", literal(from))
}

export function declare(
  type: "const" | "let" | "var",
  id: t.LVal,
  init?: t.Expression ){

  return t.variableDeclaration(type, [
    t.variableDeclarator(id, init)
  ])
}

export function objectAssign(...objects: t.Expression[]){
  return call("Object.assign", ...objects)
}

export function objectKeys(object: t.Expression){
  return call("Object.keys", object)
}

export function template(text: string){
  return t.templateLiteral([
    t.templateElement({ raw: text, cooked: text }, true)
  ], [])
}