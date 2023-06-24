import * as t from '.';

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

  if(t.isBinaryExpression(exp) && ASSERT_OP.has(exp.operator))
    return true;

  return false;
}

export function inverseExpression(exp: t.BinaryExpression){
  const inverse = INVERSE_OP.get(exp.operator) as any;
  
  if(inverse)
    return t.binaryExpression(inverse, exp.left, exp.right);

  throw new Error(`Can't invert binary comparison ${exp.operator}.`);
}

export function isFalsy(exp: t.Expression): exp is t.UnaryExpression {
  return t.isUnaryExpression(exp, { operator: "!" })
}

export function falsy(exp: t.Expression){
  return isBinaryAssertion(exp)
    ? inverseExpression(exp)
    : t.unaryExpression("!", exp, true);
}

export function and(a: t.Expression, b: t.Expression){
  return t.logicalExpression("&&", a, b);
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

  return t.conditionalExpression(test, consequent, alternate);
}