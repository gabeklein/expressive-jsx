import { BinaryExpression, Expression, UnaryExpression } from '@babel/types';

import t from '.';

const ASSERT_OP = new Set([
  "in", "instanceof", 
  "==", "===",
  "!=", "!==",
  ">", ">=",
  "<", "<="
])

const INVERSE_OP = new Map([
  ["==", "!="],
  ["===", "!=="],
  [">", "<="],
  ["<", ">="]
]);

for(const [a, b] of INVERSE_OP)
  INVERSE_OP.set(b, a);

export function isParenthesized(node: Expression){
  const { extra } = node as any;
  return extra ? extra.parenthesized === true : false;
}

export function isBinaryAssertion(
  exp: Expression | undefined): exp is BinaryExpression {

  if(t.isBinaryExpression(exp) && ASSERT_OP.has(exp.operator))
    return true;

  return false;
}

export function inverseExpression(exp: BinaryExpression){
  const inverse = INVERSE_OP.get(exp.operator) as any;
  
  if(inverse)
    return t.binaryExpression(inverse, exp.left, exp.right);

  throw new Error(`Can't invert binary comparison ${exp.operator}.`);
}