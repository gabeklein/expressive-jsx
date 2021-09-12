import * as t from 'syntax';
import type { FlatValue } from 'types';

export function toExpression(value?: FlatValue | t.Expression){
  switch(typeof value){
    case "string":
      return t.stringLiteral(value);
    case "number":
      return t.numericLiteral(value);
    case "boolean":
      return t.booleanLiteral(value);
    case "object":
      if(value === null)
        return t.nullLiteral();
      else
        return value;
    default:
      return t.identifier("undefined");
  }
}