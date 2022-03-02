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

  include(
    context: StackFrame,
    body: t.Path<any>,
    test?: t.Expression){

    const { forks } = this;
    const name = context.ambient.name!;

    if($.is(body, "IfStatement"))
      throw new Error("Nested if statements are not supported.");

    if($.is(body, "BlockStatement")){
      const inner = ensureArray(body.get("body"));

      if(inner.length == 1)
        body = inner[0];
    }

    const define =
      new DefineConsequent(context, name, body);

    define.priority = 5;
    define.context.resolveFor(forks.length);

    forks.push([define, test]);

    return define;
  }

  setup(context: StackFrame, path: t.Path<t.Statement>){
    do {
      if(!$.is(path, "IfStatement")){
        this.include(context, path);
        break;
      }

      const test = path.node.test;
      const consequent = path.get("consequent") as t.Path<any>;

      this.include(context, consequent, test);

      path = path.get("alternate") as t.Path<t.Statement>;
    }
    while(path.type)
  }
}

export class DefineConsequent extends Define {
  parent: Define;

  constructor(
    context: StackFrame,
    name: string,
    consequent: t.Path<t.Statement>){

    super(context, name);

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