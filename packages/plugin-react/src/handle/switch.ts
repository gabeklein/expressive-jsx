import * as t from '@babel/types';
import { Define } from 'handle/definition';
import { parse } from 'parse';
import { ensureArray, hash } from 'shared';

import type { NodePath as Path } from '@babel/traverse';
import type { Expression, IfStatement, Statement } from '@babel/types';
import type { StackFrame } from 'context';
import type { DefineElement } from 'handle';

type Consequent = ComponentIf | DefineConsequent;
type GetProduct = (fork: Consequent) => Expression | undefined;

const opt = t.conditionalExpression;
const not = (a: Expression) => t.unaryExpression("!", a);
const and = (a: Expression, b: Expression) => t.logicalExpression("&&", a, b);
const anti = (a: Expression) => t.isUnaryExpression(a, { operator: "!" }) ? a.argument : not(a);
const is = (a: Expression) => t.isUnaryExpression(a, { operator: "!" }) ? a : not(not(a));

export class ComponentIf {
  context!: StackFrame;

  private forks = [] as Consequent[];

  constructor(
    protected path: Path<IfStatement>,
    context: StackFrame,
    public test?: Expression){

    context = context.push(this);
  }

  toExpression(): Expression | undefined {
    return reduceToExpression(this.forks, (cond) => {
      let product;

      if(cond instanceof ComponentIf || cond.children.length)
        product = cond.toExpression();

      if(t.isBooleanLiteral(product, { value: false }))
        product = undefined;

      return product
    });
  }

  toClassName(): Expression | undefined {
    return reduceToExpression(this.forks, (cond) => {
      if(cond instanceof ComponentIf)
        return cond.toClassName();

      const className =
        cond.toClassName();
        
      if(className)
        return t.stringLiteral(className);
    });
  }

  setup(){
    const { context, forks } = this;
    let layer: Path<any> = this.path;

    while(true){
      let consequent = layer.get("consequent") as Path<any>;
      let test: Expression | undefined;

      if(layer.isIfStatement())
        test = layer.node.test;

      if(consequent.isBlockStatement()){
        const inner = ensureArray(consequent.get("body"));
        if(inner.length == 1)
          consequent = inner[0];
      }

      const fork = consequent.isIfStatement()
        ? new ComponentIf(consequent, context, test)
        : new DefineConsequent(consequent, context, forks.length, test)

      forks.push(fork);

      layer = layer.get("alternate") as Path<Statement>;

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
  anchor: DefineElement;

  constructor(
    public path: Path<Statement>,
    context: StackFrame,
    public index: number,
    public test?: Expression){

    super(context);

    this.context.resolveFor(index);

    let parent = context.currentElement as DefineElement | DefineConsequent;

    if(parent instanceof DefineConsequent)
      parent = parent.anchor;

    parent.dependant.add(this);

    this.anchor = parent;
    this.priority = 5;

    parse(this, path);
  }

  get selector(): string[] {
    let parent =
      this.context.currentElement as DefineElement | DefineConsequent;
    
    return [ ...parent.selector, "." + this.uid ];
  }

  get uid(){
    const uid = hash(this.context.prefix);
    const name = specifyOption(this.test) || `opt${this.index + 1}`;
    return `${name}_${uid}`;
  }

  toClassName(){
    return [ this, ...this.includes ]
      .filter(x => x.containsStyle(true))
      .map(x => x.setActive(this.priority))
      .join(" ");
  }

  provide(define: DefineElement){
    define.onlyWithin = this;
    define.priority = 4;

    this.anchor.provides.add(define);
  }
}

function reduceToExpression(
  forks: Consequent[],
  predicate: GetProduct){

  forks = forks.slice().reverse();
  let sum: Expression | undefined;

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

function specifyOption(test?: Expression){
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