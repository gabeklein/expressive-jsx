import { parse } from 'parse/block';
import { ensureArray } from 'utility';

import { Define } from './definition';

import * as t from 'syntax';
import type { Context } from 'context';

/** Number of consequents existing for a given parent Define. */
const conseqentsExist = new Map<Define, number>();

class DefineConsequent extends Define {
  rank: number;
  
  constructor(
    private parent: Define){

    super(parent.context);

    this.within = parent.within;
    this.priority = 5;
    this.rank = (conseqentsExist.get(this) || 0) + 1;
    this.name = this.parent.name;

    conseqentsExist.set(this, this.rank);
  }

  get isDeclared(){
    return false;
  }

  get uid(){
    return this.name + "_" + this.path(this.rank);
  }

  provide(define: Define){
    this.dependant.add(define);
    this.parent.provide(define);

    define.within = this;
    define.priority = this.priority;
  }
}

export class ComponentIf {
  private forks = [] as [Define, t.Expression?][];

  setup(context: Context, path: t.Path){
    do {
      if(!path.isIfStatement()){
        this.include(context, path);
        break;
      }

      const test = path.get("test") as t.Path<t.Expression>;
      const consequent = path.get("consequent") as t.Path;

      this.include(context, consequent, test);

      path = path.get("alternate") as t.Path;
    }
    while(path.type)
  }

  toExpression(): t.Expression | undefined {
    return this.reduce(cond => {
      if(cond.children.length)
        return cond.toExpression();
    });
  }

  toClassName(): t.Expression | undefined {
    return this.reduce(cond => {
      const segments = [];

      for(const mod of [cond, ...cond.includes]){
        mod.setActive(cond.priority);

        if(mod.isUsed)
          segments.push(mod.uid);
      }
        
      if(segments.length)
        return t.literal(segments.join(" "));
    });
  }

  include(
    context: Context,
    body: t.Path,
    test?: t.Path<t.Expression>){

    const { forks } = this;

    if(body.isIfStatement())
      throw new Error("Nested if statements are not supported.");

    if(body.isBlockStatement()){
      const inner = ensureArray(body.get("body"));

      if(inner.length == 1)
        body = inner[0];
    }

    const define = new DefineConsequent(context.define);

    define.context.name = String(forks.length);

    parse(define, body);

    forks.push([define, test && test.node]);

    return define;
  }

  reduce(predicate: (fork: Define) => t.Expression | undefined){
    const forks = this.forks.slice().reverse();
    let sum: t.Expression | undefined;
  
    for(const [ cond, test ] of forks){
      const product = predicate(cond);
  
      if(sum && test)
        sum = product
          ? t.ternary(test, product, sum)
          : t.and(t.anti(test), sum)
      else if(product)
        sum = test
          ? t.and(t.truthy(test), product)
          : product
    }
  
    return sum;
  }

  specify(test?: t.Expression){
    if(!test)
      return false;
  
    if(t.isFalsy(test) && t.isIdentifier(test.argument))
      return `not_${test.argument.name}`;
  
    if(t.isIdentifier(test))
      return test.name;
  }
}