import * as s from './';
import * as t from '@babel/types';

const COMPARE_OP = new Set([
  "==", "===", "!=", "!==", "in", "instanceof", ">", "<", ">=", "<="
])

const INVERSE_OP = new Map([
  ["==", "!="], ["===", "!=="], [">", "<="], ["<", ">="]
]);

for(const [a, b] of INVERSE_OP)
  INVERSE_OP.set(b, a);
  
export const cond = t.conditionalExpression;

export function isInParenthesis(node: t.Expression){
  const { extra } = node as any;
  return extra ? extra.parenthesized === true : false;
}

export function isBinaryAssertion(
  exp: t.Expression | undefined): exp is t.BinaryExpression {

  if(s.assert(exp, "BinaryExpression"))
    if(COMPARE_OP.has(exp.operator))
      return true;

  return false;
}

export function inverseExpression(exp: t.BinaryExpression){
  const inverse = INVERSE_OP.get(exp.operator) as any;
  
  if(inverse)
    return t.binaryExpression(inverse, exp.left, exp.right);
  else
    throw new Error(`Can't invert binary comparison ${exp.operator}.`);
}

export function isNotAssertion(
  exp: t.Expression): exp is t.UnaryExpression{

  return s.assert(exp, "UnaryExpression") && exp.operator == "!";
}

export function not(exp: t.Expression){
  if(isBinaryAssertion(exp))
    return inverseExpression(exp);
  else
    return t.unaryExpression("!", exp);
}

export function and(a: t.Expression, b: t.Expression){
  return t.logicalExpression("&&", a, b);
}

export function anti(exp: t.Expression){
  if(isNotAssertion(exp))
    return exp.argument;
  else
    return not(exp);
}

export function is(a: t.Expression){
  if(isNotAssertion(a) || isBinaryAssertion(a))
    return a;
  else
    return not(not(a));
}