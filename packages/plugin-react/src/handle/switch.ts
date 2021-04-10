import {
  conditionalExpression,
  isBooleanLiteral,
  isIdentifier,
  isUnaryExpression,
  logicalExpression,
  stringLiteral,
  unaryExpression,
} from '@babel/types';
import { Define } from 'handle/modifier';
import { parse, ParseContent } from 'parse';
import { ensureArray, hash } from 'shared';

import type { NodePath as Path } from '@babel/traverse';
import type { Expression, IfStatement, Statement } from '@babel/types';
import type { StackFrame } from 'context';
import type { DefineElement } from 'handle';

type Consequent = ComponentIf | DefineConsequent;
type GetProduct = (fork: Consequent) => Expression | undefined;

const opt = conditionalExpression;
const not = (a: Expression) => unaryExpression("!", a);
const and = (a: Expression, b: Expression) => logicalExpression("&&", a, b);
const anti = (a: Expression) => isUnaryExpression(a, { operator: "!" }) ? a.argument : not(a);
const is = (a: Expression) => not(not(a));

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

      if(isBooleanLiteral(product, { value: false }))
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
        return stringLiteral(className);
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
        : new DefineConsequent(
          consequent,
          context,
          forks.length + 1,
          test
        )

      const index = forks.push(fork);
      fork.context.resolveFor(index);

      layer = layer.get("alternate") as Path<Statement>;

      if(layer.type === undefined)
        break;

      if(layer.type !== "IfStatement"){
        forks.push(
          new DefineConsequent(layer, context, forks.length + 1)
        );
  
        break;
      }
    }
  }
}

export class DefineConsequent extends Define {
  anchor: DefineElement;
  selector: string[];
  ownSelector?: string;

  constructor(
    public path: Path<Statement>,
    public context: StackFrame,
    public index: number,
    public test?: Expression){

    super(context);

    const uid = hash(context.prefix);
    const name = specifyOption(test) || `opt${index}`;
    const selector = `${name}_${uid}`;

    let select;
    let parent = context.currentElement as DefineElement | DefineConsequent;

    if(parent instanceof DefineConsequent){
      select = [ ...parent.selector || [] ];
      parent = parent.anchor;
    }
    else 
      select = [ `.${parent.uid}` ];

    if(selector)
      select.push(`.${selector}`);

    this.anchor = parent;
    this.selector = select;
    this.ownSelector = selector;
    this.priority = 5;

    parse(this, ParseContent, path);
  }

  toClassName(){
    const { includes, ownSelector } = this;

    const include = [ ...includes ].map(x => x.uid);

    if(this.containsStyle(true))
      include.unshift(ownSelector!);

    if(include.length){
      this.setActive();
      return include.join(" ");
    }
  }

  use(define: DefineElement){
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

  if(isUnaryExpression(test, { operator: "!" })){
    test = test.argument;
    ref = "not_"
  }

  if(isIdentifier(test))
    return ref + test.name;
}