import * as t from 'syntax';

import type { Consequent } from 'handle/switch';

type GetProduct = (fork: Consequent) => t.Expression | undefined;

const opt = t.conditionalExpression;
const not = (a: t.Expression) => t.isBinaryAssertion(a) ? t.inverseExpression(a) : t.unaryExpression("!", a);
const and = (a: t.Expression, b: t.Expression) => t.logicalExpression("&&", a, b);
const anti = (a: t.Expression) => t.isUnaryExpression(a, { operator: "!" }) ? a.argument : not(a);
const is = (a: t.Expression) => t.isUnaryExpression(a, { operator: "!" }) || t.isBinaryAssertion(a) ? a : not(not(a));

export function reduceToExpression(
  forks: Consequent[],
  predicate: GetProduct){

  forks = forks.slice().reverse();
  let sum: t.Expression | undefined;

  for(const cond of forks){
    const test = cond.test;
    const product = predicate(cond);

    if(sum && test)
      sum = product
        ? opt(test, product, sum)
        : and(anti(test), sum)
    else if(product)
      sum = test
        ? and(is(test), product)
        : product
  }

  return sum;
}

export function specifyOption(test?: t.Expression){
  if(!test)
    return "else"

  let ref = "if_";

  if(t.isUnaryExpression(test, { operator: "!" })){
    test = test.argument;
    ref = "not_"
  }

  if(t.isIdentifier(test))
    return ref + test.name;
}