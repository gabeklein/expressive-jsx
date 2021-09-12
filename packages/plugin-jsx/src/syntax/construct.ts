import * as t from '@babel/types';

import type { BunchOf, FlatValue } from 'types';

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
      return t.stringLiteral(value);
    case "number":
      return t.numericLiteral(value);
    case "boolean":
      return t.booleanLiteral(value);
    case "undefined":
      return t.identifier("undefined");
    case "object":
      if(value === null)
        return t.nullLiteral();
    default:
      throw new Error("Not a literal type");
  }
}

export function selector(name: string){
  return /^[A-Za-z0-9$_]+$/.test(name)
    ? t.identifier(name)
    : t.stringLiteral(name)
}

export function property(
  key: string | t.StringLiteral | t.Identifier,
  value: t.Expression){

  const shorthand =
    value.type == "Identifier" &&
    value.name == key;

  if(typeof key == "string")
    key = selector(key);

  return t.objectProperty(key, value, false, shorthand);
}

export function object(
  obj: BunchOf<t.Expression | false | undefined> = {}){

  const properties = [];

  for(const [key, value] of Object.entries(obj))
    if(value)
      properties.push(property(key, value))

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
      select = selector(member);
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

export function call(
  callee: t.Expression | string, ...args: t.Expression[]){

  if(typeof callee == "string")
    callee = get(callee);

  return t.callExpression(callee, args)
}

export function require(from: string){
  return call("require", literal(from))
}

export function declare(
  type: "const" | "let" | "var", id: t.LVal, init?: t.Expression ){

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