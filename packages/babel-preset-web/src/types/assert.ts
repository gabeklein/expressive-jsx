import { BinaryExpression, Expression, UnaryExpression } from '@babel/types';

import { t } from './';

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

export function isFalsy(exp: Expression): exp is UnaryExpression {
  return t.isUnaryExpression(exp, { operator: "!" })
}

export function falsy(exp: Expression){
  return isBinaryAssertion(exp)
    ? inverseExpression(exp)
    : t.unaryExpression("!", exp, true);
}

export function and(a: Expression, b: Expression){
  return t.logicalExpression("&&", a, b);
}

export function anti(exp: Expression){
  return isFalsy(exp) ? exp.argument : falsy(exp);
}

export function truthy(a: Expression){
  return isFalsy(a) || isBinaryAssertion(a) ? a : falsy(falsy(a));
}

export function ternary(
  test: Expression,
  consequent: Expression,
  alternate: Expression){

  return t.conditionalExpression(test, consequent, alternate);
}