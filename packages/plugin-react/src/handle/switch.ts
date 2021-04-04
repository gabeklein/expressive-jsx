import {
  conditionalExpression,
  isBooleanLiteral,
  isIdentifier,
  isUnaryExpression,
  logicalExpression,
  stringLiteral,
  unaryExpression,
} from '@babel/types';
import { DefineContingent, ElementInline } from 'handle';
import { parse, ParseConsequent } from 'parse';
import { ensureArray, hash } from 'shared';

import type { NodePath as Path } from '@babel/traverse';
import type {
  Expression,
  IfStatement,
  Statement
} from '@babel/types';
import type { StackFrame } from 'context';

type Consequent = ComponentIf | ComponentConsequent;
type GetProduct = (fork: Consequent) => Expression | undefined;

const opt = conditionalExpression;
const not = (a: Expression) => unaryExpression("!", a);
const and = (a: Expression, b: Expression) => logicalExpression("&&", a, b);

//TODO: figure out if falsey values interfere before allowing them through
// const anti = (a: Expression) => isUnaryExpression(a, { operator: "!" }) ? a.argument : not(a);
const anti = not;

export class ComponentIf {
  context!: StackFrame;

  private forks = [] as Consequent[];

  constructor(
    protected path: Path<IfStatement>,
    context: StackFrame,
    public test?: Expression){

    context = context.push(this);
  }

  toExpression(context: StackFrame): Expression | undefined {
    function generate(cond: Consequent){
      let product;

      if(cond instanceof ComponentIf)
        product = cond.toExpression(context);
      else if(cond.children.length)
        product = cond.toExpression();

      if(isBooleanLiteral(product, { value: false }))
        product = undefined;

      return product
    }

    return reduceToExpression(this.forks, generate);
  }

  toClassName(): Expression | undefined {
    function generate(cond: Consequent){
      if(cond instanceof ComponentIf)
        return cond.toClassName();

      const className =
        cond.definition.toClassName();
        
      if(className)
        return stringLiteral(className);
    }

    return reduceToExpression(this.forks, generate);
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
        : new ComponentConsequent(
          consequent,
          context,
          forks.length + 1,
          test
        )

      const index = forks.push(fork);
      fork.context.resolveFor(index);

      if(fork instanceof ComponentConsequent)
        fork.index = index;

      layer = layer.get("alternate") as Path<Statement>

      if(layer.type === "IfStatement")
        continue;

      const final =
        new ComponentConsequent(
          layer, context, forks.length + 1
        );

      forks.push(final);

      break;
    }
  }
}

export class ComponentConsequent extends ElementInline {
  definition = this.slaveNewModifier();

  get parentElement(){
    return this.context.currentElement;
  }

  constructor(
    public path: Path<Statement> | undefined,
    public context: StackFrame,
    public index: number,
    public test?: Expression){

    super(context);

    if(!path || !path.node)
      return;

    parse(this, ParseConsequent, path);
  }

  toExpression(){
    return super.toExpression(true);
  }

  slaveNewModifier(){
    let { context, test, index } = this;

    const uid = hash(context.prefix);
    const name = specifyOption(test) || `opt${index}`;
    const selector = `${name}_${uid}`;

    const parent = context.currentElement!;
    const mod = new DefineContingent(context, parent, selector);

    mod.priority = 5;

    return mod;
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
        ? and(test, product)
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