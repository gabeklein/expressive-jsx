import * as s from 'syntax';

import type * as t from 'syntax/types';
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
        ? s.cond(test, product, sum)
        : s.and(s.anti(test), sum)
    else if(product)
      sum = test
        ? s.and(s.assert(test), product)
        : product
  }

  return sum;
}

export function specifyOption(test?: t.Expression){
  if(!test)
    return "else"

  let ref = "if_";

  if(s.isNotAssertion(test)){
    test = test.argument;
    ref = "not_"
  }

  if(test.type == "Identifier")
    return ref + test.name;
}