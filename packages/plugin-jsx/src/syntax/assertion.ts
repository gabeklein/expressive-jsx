import type * as t from './types';
import { is, create } from './nodes';

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

  if(is(exp, "BinaryExpression"))
    if(ASSERT_OP.has(exp.operator))
      return true;

  return false;
}

export function inverseExpression(exp: t.BinaryExpression){
  const inverse = INVERSE_OP.get(exp.operator) as any;
  
  if(inverse)
    return create("BinaryExpression", {
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
  if(isBinaryAssertion(exp))
    return inverseExpression(exp);
  else
    return create("UnaryExpression", {
      operator: "!", prefix: true, argument: exp
    })
}

export function and(a: t.Expression, b: t.Expression){
  return create("LogicalExpression", {
    operator: "&&", left: a, right: b
  })
}

export function anti(exp: t.Expression){
  if(isFalsy(exp))
    return exp.argument;
  else
    return falsy(exp);
}

export function truthy(a: t.Expression){
  if(isFalsy(a) || isBinaryAssertion(a))
    return a;
  else
    return falsy(falsy(a));
}

export function ternary(
  test: t.Expression,
  consequent: t.Expression,
  alternate: t.Expression){

  return create("ConditionalExpression", {
    test, consequent, alternate
  })
}