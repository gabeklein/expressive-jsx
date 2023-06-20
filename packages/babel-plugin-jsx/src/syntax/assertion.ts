import type * as t from './types';
import { is, node } from './nodes';

const ASSERT_OP = new Set([
  "in", "instanceof", 
  "==", "===",
  "!=", "!==",
  ">", "<",
  ">=", "<="
])

const INVERSE_OP = new Map([
  ["==", "!="],
  ["===", "!=="],
  [">", "<="],
  ["<", ">="]
]);

for(const [a, b] of INVERSE_OP)
  INVERSE_OP.set(b, a);

export function isParenthesized(node: t.Expression){
  const { extra } = node as any;
  return extra ? extra.parenthesized === true : false;
}

export function isBinaryAssertion(
  exp: t.Expression | undefined): exp is t.BinaryExpression {

  if(is(exp, "BinaryExpression") && ASSERT_OP.has(exp.operator))
    return true;

  return false;
}

export function inverseExpression(exp: t.BinaryExpression){
  const inverse = INVERSE_OP.get(exp.operator) as any;
  
  if(inverse)
    return node("BinaryExpression", {
      operator: inverse,
      left: exp.left,
      right: exp.right
    })

  throw new Error(`Can't invert binary comparison ${exp.operator}.`);
}

export function isFalsy(
  exp: t.Expression): exp is t.UnaryExpression{

  return is(exp, "UnaryExpression") && exp.operator == "!";
}

export function falsy(exp: t.Expression){
  return isBinaryAssertion(exp)
    ? inverseExpression(exp)
    : node("UnaryExpression", {
      operator: "!", prefix: true, argument: exp
    });
}

export function and(a: t.Expression, b: t.Expression){
  return node("LogicalExpression", {
    operator: "&&", left: a, right: b
  })
}

export function anti(exp: t.Expression){
  return isFalsy(exp) ? exp.argument : falsy(exp);
}

export function truthy(a: t.Expression){
  return isFalsy(a) || isBinaryAssertion(a) ? a : falsy(falsy(a));
}

export function ternary(
  test: t.Expression,
  consequent: t.Expression,
  alternate: t.Expression){

  return node("ConditionalExpression", {
    test, consequent, alternate
  })
}