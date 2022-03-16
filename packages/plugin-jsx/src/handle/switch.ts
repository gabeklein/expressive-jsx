import { parse } from 'parse/body';
import * as $ from 'syntax';
import { ensureArray } from 'utility';

import { Define } from './definition';

import type * as t from 'syntax/types';
import type { StackFrame } from 'context';

export class ComponentIf {
  private forks = [] as [Define, t.Expression?][];

  setup(context: StackFrame, path: t.Path<any>){
    do {
      if(!$.is(path, "IfStatement")){
        this.include(context, path);
        break;
      }

      const test = path.get("test") as t.Path<t.Expression>;
      const consequent = path.get("consequent") as t.Path<t.Statement>;

      this.include(context, consequent, test);

      path = path.get("alternate") as t.Path<t.Statement>;
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
        return $.literal(segments.join(" "));
    });
  }

  include(
    context: StackFrame,
    body: t.Path<any>,
    test?: t.Path<t.Expression>){

    const { forks } = this;
    const name = context.ambient.name!;

    if($.is(body, "IfStatement"))
      throw new Error("Nested if statements are not supported.");

    if($.is(body, "BlockStatement")){
      const inner = ensureArray(body.get("body"));

      if(inner.length == 1)
        body = inner[0];
    }

    const define = new Define(context, name);

    define.priority = 5;
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
          ? $.ternary(test, product, sum)
          : $.and($.anti(test), sum)
      else if(product)
        sum = test
          ? $.and($.truthy(test), product)
          : product
    }
  
    return sum;
  }

  specify(test?: t.Expression){
    if(!test)
      return false;
  
    if($.isFalsy(test) && $.is(test.argument, "Identifier"))
      return `not_${test.argument.name}`;
  
    if($.is(test, "Identifier"))
      return test.name;
  }
}