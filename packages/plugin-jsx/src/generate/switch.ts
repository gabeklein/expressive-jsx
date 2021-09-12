import * as t from 'syntax';

import type { Consequent } from 'handle/switch';

type GetProduct = (fork: Consequent) => t.Expression | undefined;

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
        ? t.cond(test, product, sum)
        : t.and(t.anti(test), sum)
    else if(product)
      sum = test
        ? t.and(t.assert(test), product)
        : product
  }

  return sum;
}

export function specifyOption(test?: t.Expression){
  if(!test)
    return "else"

  let ref = "if_";

  if(t.isNotAssertion(test)){
    test = test.argument;
    ref = "not_"
  }

  if(test.type == "Identifier")
    return ref + test.name;
}