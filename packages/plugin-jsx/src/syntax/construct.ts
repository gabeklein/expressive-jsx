import {
  arrowFunctionExpression,
  blockStatement,
  booleanLiteral,
  callExpression,
  expressionStatement,
  identifier,
  memberExpression,
  nullLiteral,
  numericLiteral,
  objectExpression,
  objectPattern,
  objectProperty,
  returnStatement,
  spreadElement,
  stringLiteral,
  templateElement,
  templateLiteral,
  thisExpression,
  variableDeclaration,
  variableDeclarator,
} from './primitives';

import * as s from './';

import type * as t from '@babel/types';
import type { BunchOf, FlatValue } from 'types';

const IdentifierType = /(Expression|Literal|Identifier|JSXElement|JSXFragment|Import|Super|MetaProperty|TSTypeAssertion)$/;

export function isExpression(node: any): node is t.Expression {
  return typeof node == "object" && IdentifierType.test(node.type);
}

export function expression(value?: FlatValue | t.Expression){
  try {
    return literal(value as any);
  }
  catch(err){
    return value as t.Expression;
  }
}

export function literal(value: string): t.StringLiteral;
export function literal(value: number): t.NumericLiteral;
export function literal(value: boolean): t.BooleanLiteral;
export function literal(value: null): t.NullLiteral;
export function literal(value: undefined): t.Identifier;
export function literal(value: string | number | boolean | null | undefined){
  switch(typeof value){
    case "string":
      return stringLiteral(value);
    case "number":
      return numericLiteral(value);
    case "boolean":
      return booleanLiteral(value);
    case "undefined":
      return id("undefined");
    case "object":
      if(value === null)
        return nullLiteral();
    default:
      throw new Error("Not a literal type");
  }
}

export function id(name: string){
  return identifier(name);
}

export function selector(name: string){
  return /^[A-Za-z0-9$_]+$/.test(name)
    ? id(name)
    : stringLiteral(name)
}

export function property(
  key: string | t.StringLiteral | t.Identifier,
  value: t.Expression){

  let shorthand = false;

  if(typeof key == "string"){
    shorthand = s.assert(value, "Identifier", { name: key })
    key = selector(key);
  }

  return objectProperty(key, value, false, shorthand);
}

export function spread(value: t.Expression){
  return spreadElement(value);
}

export function pattern(
  properties: (t.RestElement | t.ObjectProperty)[]){

  return objectPattern(properties);
}

export function object(
  obj: (t.ObjectProperty | t.SpreadElement)[] | BunchOf<t.Expression | false | undefined> = {}){

  let properties = [];

  if(Array.isArray(obj))
    properties = obj;
  else
    for(const [key, value] of Object.entries(obj))
      if(value)
        properties.push(property(key, value))

  return objectExpression(properties);
}

export function get(object: "this"): t.ThisExpression;
export function get<T extends t.Expression> (object: T): T;
export function get(object: string | t.Expression, ...path: (string | number)[]): t.MemberExpression;
export function get(object: string | t.Expression, ...path: (string | number)[]){
  if(object == "this")
    object = thisExpression()

  if(typeof object == "string")
    path = [...object.split("."), ...path]

  for(const member of path){
    let select;

    if(typeof member == "string"){
      select = selector(member);
    }
    else if(typeof member == "number")
      select = literal(member);
    else
      throw new Error("Bad member id, only strings and numbers are allowed")

    object = typeof object == "object"
      ? memberExpression(object, select, select!.type !== "Identifier")
      : select;
  }

  return object as t.Expression;
}

export function call(
  callee: t.Expression | string, ...args: t.Expression[]){

  if(typeof callee == "string")
    callee = get(callee);

  return callExpression(callee, args)
}

export function require(from: string){
  return call("require", literal(from))
}

export function returns(exp: t.Expression){
  return returnStatement(exp);
}

export function declare(
  type: "const" | "let" | "var", id: t.LVal, init?: t.Expression ){

  return variableDeclaration(type, [
    variableDeclarator(id, init)
  ])
}

export function objectAssign(...objects: t.Expression[]){
  return call("Object.assign", ...objects)
}

export function objectKeys(object: t.Expression){
  return call("Object.keys", object)
}

export function template(text: string){
  return templateLiteral([
    templateElement({ raw: text, cooked: text }, true)
  ], [])
}

export function statement(from: t.Statement | t.Expression){
  if(isExpression(from))
    return expressionStatement(from);
  else
    return from;
}

export function block(
  ...statements: (t.Statement | t.Expression)[]){

  const stats = statements.map(statement);
  
  return blockStatement(stats);
}

export function arrow(
  params: (t.Identifier | t.Pattern | t.RestElement | t.TSParameterProperty)[],
  body: t.BlockStatement | t.Expression,
  async?: boolean | undefined){

  return arrowFunctionExpression(params, body, async);
}