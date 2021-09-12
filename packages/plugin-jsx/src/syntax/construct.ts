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

export function property(
  key: string | t.StringLiteral | t.Identifier,
  value: t.Expression,
  computed?: boolean | undefined,
  shorthand?: boolean | undefined){

  if(typeof key == "string")
    key = literal(key);

  return t.objectProperty(key, value, computed, shorthand);
}

export function object(
  obj: BunchOf<t.Expression | false | undefined> = {}){

  const properties = [];

  for(const [key, value] of Object.entries(obj))
    if(value)
      properties.push(property(key, value))

  return t.objectExpression(properties);
}