import { reduceToExpression, specifyOption } from 'generate/switch';
import { parse } from 'parse/body';
import * as t from 'syntax';
import { ensureArray } from 'utility';

import { Define } from './definition';

import type { StackFrame } from 'context';
import type { DefineElement } from 'handle/definition';

export type Consequent = ComponentIf | DefineConsequent;

export class ComponentIf {
  private forks = [] as Consequent[];

  constructor(
    public test?: t.Expression){
  }

  toExpression(): t.Expression | undefined {
    return reduceToExpression(this.forks, (cond) => {
      let product;

      if(cond instanceof ComponentIf || cond.children.length)
        product = cond.toExpression();

      return product
    });
  }

  toClassName(): t.Expression | undefined {
    return reduceToExpression(this.forks, (cond) => {
      if(cond instanceof ComponentIf)
        return cond.toClassName();

      const className = cond.toClassName();
        
      if(className)
        return t.literal(className);
    });
  }

  setup(context: StackFrame, path: t.Path<t.IfStatement>){
    const { forks } = this;
    let layer = path as t.Path<any>;

    while(true){
      let consequent = layer.get("consequent") as t.Path<any>;
      let test: t.Expression | undefined;

      if(layer.isIfStatement())
        test = layer.node.test;

      if(consequent.isBlockStatement()){
        const inner = ensureArray(consequent.get("body"));

        if(inner.length == 1)
          consequent = inner[0];
      }

      const fork = consequent.isIfStatement()
        ? new ComponentIf(test)
        : new DefineConsequent(consequent, context, forks.length, test)

      forks.push(fork);

      layer = layer.get("alternate") as t.Path<t.Statement>;

      if(layer.type === undefined)
        break;

      if(layer.type !== "IfStatement"){
        forks.push(
          new DefineConsequent(layer, context, forks.length)
        );
  
        break;
      }
    }
  }
}

export class DefineConsequent extends Define {
  test: t.Expression | undefined;
  anchor: DefineElement;

  constructor(
    consequent: t.Path<t.Statement>,
    context: StackFrame,
    index: number,
    test?: t.Expression){

    super(context);

    this.test = test;
    this.context.resolveFor(index);
    this.name = specifyOption(test) || `opt${index + 1}`;

    let parent = context.currentElement as DefineElement | DefineConsequent;

    if(parent instanceof DefineConsequent)
      parent = parent.anchor;

    parent.dependant.add(this);

    this.anchor = parent;
    this.priority = 5;

    parse(this, consequent);
  }

  get selector(): string[] {
    let parent = this.context.currentElement!;

    if(!parent)
      throw new Error("No consequent parent found.")

    return parent.selector.map(x => `${x}.${this.uid}`);
  }

  get isDeclared(){
    return false;
  }

  toClassName(){
    const segments = [];

    for(const mod of [this, ...this.includes]){
      mod.setActive(this.priority);

      if(mod.isUsed)
        segments.push(mod.uid);
    }

    return segments.join(" ");
  }

  provide(define: DefineElement){
    define.onlyWithin = this;
    define.priority = 4;

    this.anchor.provide(define);
    this.dependant.add(define);
  }
}