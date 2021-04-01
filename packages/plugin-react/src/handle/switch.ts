import {
  booleanLiteral,
  conditionalExpression,
  isBooleanLiteral,
  isIdentifier,
  isUnaryExpression,
  logicalExpression,
  stringLiteral,
  unaryExpression,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { generateElement } from 'generate';
import { ComponentExpression, DefineContingent, ElementInline } from 'handle';
import { parse, ParseConsequent } from 'parse';
import { ensureArray, hash } from 'shared';

import type { NodePath as Path } from '@babel/traverse';
import type {
  Expression,
  IfStatement,
  Statement
} from '@babel/types';
import type { StackFrame } from 'context';
import type { InnerContent } from 'types';

const Oops = ParseErrors({
  ReturnElseNotImplemented: "This is an else condition, returning from here is not implemented.",
  IfStatementCannotContinue: "Previous consequent already returned, cannot integrate another clause.",
  CantReturnInNestedIf: "Cant return because this if-statement is nested!",
  CanOnlyReturnTopLevel: "Cant return here because immediate parent is not the component.",
  CanOnlyReturnFromLeadingIf: "Cant return here because it's not the first if consequent in-chain."
})

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
  hasElementOutput?: true;
  hasStyleOutput?: true;

  private forks = [] as Consequent[];

  static insert(
    path: Path<IfStatement>,
    parent: ElementInline
  ){
    const item = new this(path, parent.context);

    parent.adopt(item);
    item.setup();
  }

  constructor(
    protected path: Path<IfStatement>,
    context: StackFrame,
    public test?: Expression){

    context = context.push(this);
    context.currentIf = this;

    if(!test)
      context.parentIf = this;
  }

  toExpression(context: StackFrame): Expression | undefined {
    if(!this.hasElementOutput)
      return;

    return reduceToExpression(this.forks, (cond) => {
      let product;

      if(cond instanceof ComponentIf)
        product = cond.toExpression(context);
      else if(cond.children.length)
        product = cond.toExpression();

      if(isBooleanLiteral(product, { value: false }))
        product = undefined;

      return product
    })
  }

  toClassName(): Expression | undefined {
    if(!this.hasStyleOutput)
      return;
    
    return reduceToExpression(this.forks, (cond) => {
      if(cond instanceof ComponentIf)
        return cond.toClassName();

      const className =
        cond.definition.toClassName();
        
      if(className)
        return stringLiteral(className);
    })
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

      const overrideRest = "doesReturn" in fork;

      if(overrideRest && layer.node)
        throw Oops.IfStatementCannotContinue(layer)

      if(layer.type === "IfStatement")
        continue

      const final =
        new ComponentConsequent(
          layer, context, forks.length + 1
        );

      forks.push(final);

      if(overrideRest){
        final.name = context.currentElement!.name
        final.explicitTagName = "div"
        const { current } = context.parent;
        if(current instanceof ComponentExpression)
          current.forwardTo = final
      }
      break;
    }
  }
}

export class ComponentConsequent extends ElementInline {
  definition = this.slaveNewModifier();
  doesReturn?: true;

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
    const info = generateElement(this);
    return this.context.Imports.container(info);
  }

  adopt(child: InnerContent){
    let { context } = this;

    if(!context.currentIf!.hasElementOutput)
      do {
        if(context.current instanceof ComponentIf)
          context.current.hasElementOutput = true;
        else break;
      }
      while(context = context.parent);

    super.adopt(child)
  }

  slaveNewModifier(){
    let { context, test, index } = this;

    const uid = hash(context.prefix);
    const name = specifyOption(test) || `opt${index}`;
    const selector = `${name}_${uid}`;

    const parent = context.currentElement!;
    const mod = new DefineContingent(context, parent, selector);

    mod.priority = 5

    if(!context.currentIf!.hasStyleOutput)
      do {
        if(context.current instanceof ComponentIf)
          context.current.hasStyleOutput = true;
        else break;
      }
      while(context = context.parent)

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

  return sum || booleanLiteral(false)
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