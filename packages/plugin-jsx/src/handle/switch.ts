import { parse } from 'parse/body';
import * as $ from 'syntax';
import { ensureArray } from 'utility';

import { Define } from './definition';

import type * as t from 'syntax/types';
import type { StackFrame } from 'context';

export type Consequent = ComponentIf | DefineConsequent;

export class ComponentIf {
  private forks = [] as [Consequent, t.Expression?][];

  toExpression(): t.Expression | undefined {
    return reduceToExpression(this.forks, (cond) => {
      if(cond instanceof ComponentIf || cond.children.length)
        return cond.toExpression();
    });
  }

  toClassName(): t.Expression | undefined {
    return reduceToExpression(this.forks, (cond) => {
      if(cond instanceof ComponentIf)
        return cond.toClassName();

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

  setup(context: StackFrame, path: t.Path<t.IfStatement>){
    const { forks } = this;
    const name = context.ambient.name!;
    let layer = path as t.Path<t.IfStatement | t.Statement>;

    while(true){
      if(!$.is(layer, "IfStatement")){
        forks.push([
          new DefineConsequent(context, name, forks.length, layer)
        ]);

        return;
      }

      const test  = layer.node.test;
      let consequent = layer.get("consequent") as t.Path<any>;

      if($.is(consequent, "IfStatement"))
        throw new Error("Nested if statements are not supported.");

      if($.is(consequent, "BlockStatement")){
        const inner = ensureArray(consequent.get("body"));

        if(inner.length == 1)
          consequent = inner[0];
      }

      const fork =
        new DefineConsequent(context, name, forks.length, consequent);

      forks.push([fork, test]);

      layer = layer.get("alternate") as t.Path<t.Statement>;

      if(layer.type === undefined)
        break;
    }
  }
}

export class DefineConsequent extends Define {
  parent: Define;

  constructor(
    context: StackFrame,
    name: string,
    index: number,
    consequent: t.Path<t.Statement>){

    super(context, name);

    this.priority = 5;
    this.context.resolveFor(index);

    let parent = context.currentElement!

    if(parent instanceof DefineConsequent)
      parent = parent.parent;

    this.parent = parent;

    // parent.dependant.add(this);
    parse(this, consequent);
  }

  get isDeclared(){
    return false;
  }

  provide(define: Define){
    define.contingent = this;
    define.priority = 4;

    this.parent.provide(define);
    this.dependant.add(define);
  }
}

function reduceToExpression(
  forks: [Consequent, t.Expression?][],
  predicate: (fork: Consequent) => t.Expression | undefined){

  forks = forks.slice().reverse();
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

void function specifyOption(test?: t.Expression){
  if(!test)
    return false;

  if($.isFalsy(test) && $.is(test.argument, "Identifier"))
    return `not_${test.argument.name}`;

  if($.is(test, "Identifier"))
    return test.name;
}