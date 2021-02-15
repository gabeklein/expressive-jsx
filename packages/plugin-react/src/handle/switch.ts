import { expressionStatement, isDoExpression, isExpression, isIdentifier, isUnaryExpression } from '@babel/types';
import { ParseErrors } from 'errors';
import { ComponentExpression, ContingentModifier, ElementInline } from 'handle';
import { ensureArray, hash } from 'shared';

import type { NodePath as Path } from '@babel/traverse';
import type {
  Expression,
  ExpressionStatement,
  IfStatement,
  LabeledStatement,
  ReturnStatement,
  Statement
} from '@babel/types';
import type { TraversableBody } from 'handle';
import type { StackFrame } from 'context';
import type { DoExpressive, InnerContent } from 'types';

const Oops = ParseErrors({
  ReturnElseNotImplemented: "This is an else condition, returning from here is not implemented.",
  IfStatementCannotContinue: "Previous consequent already returned, cannot integrate another clause.",
  CantReturnInNestedIf: "Cant return because this if-statement is nested!",
  CanOnlyReturnTopLevel: "Cant return here because immediate parent is not the component.",
  CanOnlyReturnFromLeadingIf: "Cant return here because it's not the first if consequent in-chain."
})

type Consequent = ComponentIf | ComponentConsequent;

export class ComponentIf {

  forks = [] as Consequent[];
  context: StackFrame;
  hasElementOutput?: true;
  hasStyleOutput?: true;
  doBlocks = [] as ExpressionStatement[];

  constructor(
    protected path: Path<IfStatement>,
    context: StackFrame,
    public test?: Expression){

    context = this.context = context.create(this);
    context.currentIf = this;
    if(!test)
      context.parentIf = this;
  }

  wasAddedTo(parent: TraversableBody){
    const { context } = this;
    let layer: Path<any> = this.path;

    while(true){
      let consequent = layer.get("consequent") as Path<any>;
      let test: Expression | undefined;

      if(layer.isIfStatement())
        test = layer.node.test;

      if(consequent.isBlockStatement()){
        const inner = ensureArray(consequent.get("body"));
        if(inner.length == 1)
          consequent = inner[0]
      }

      const fork = consequent.isIfStatement()
        ? new ComponentIf(
          consequent,
          context,
          test
        )
        : new ComponentConsequent(
          consequent,
          context,
          this.forks.length + 1,
          test
        )

      const index = this.forks.push(fork);
      fork.context.resolveFor(index);

      if(fork instanceof ComponentConsequent)
        fork.index = index;

      layer = layer.get("alternate") as Path<Statement>

      const overrideRest = (<ComponentConsequent>fork).doesReturn || false;

      if(overrideRest && layer.node)
        throw Oops.IfStatementCannotContinue(layer)

      if(layer.type === "IfStatement")
        continue

      const final = new ComponentConsequent(
        layer,
        this.context,
        this.forks.length + 1
      );

      this.forks.push(final);

      if(overrideRest){
        final.name = context.currentElement!.name
        final.explicitTagName = "div"
        const { current } = context.parent;
        if(current instanceof ComponentExpression)
          current.forwardTo = final
      }
      break;
    }

    const doInsert = [] as ExpressionStatement[];

    for(const fork of this.forks)
      if(fork instanceof ComponentConsequent
      && fork.doBlock)
        doInsert.push(
          expressionStatement(fork.doBlock)
        )

    this.doBlocks = doInsert;
  }
}

export class ComponentConsequent extends ElementInline {

  slaveModifier?: ContingentModifier;
  usesClassname?: string;
  doesReturn?: true;

  constructor(
    public path: Path<Statement> | undefined,
    public context: StackFrame,
    public index: number,
    public test?: Expression){

    super(context);

    if(!path || !path.node)
      return;

    this.doBlock = this.handleContentBody(path.node);

    if(!this.doBlock){
      this.didExitOwnScope();
      const child = this.children[0];
      if(child instanceof ElementInline)
        this.doBlock = child.doBlock
    }
  }

  get parentElement(){
    return this.context.currentElement;
  }

  adopt(child: InnerContent){
    let { context } = this;
    if(!context.currentIf!.hasElementOutput)
      do {
        if(context.current instanceof ComponentIf)
          context.current.hasElementOutput = true;
        else break;
      }
      while(context = context.parent)
    super.adopt(child)
  }

  didExitOwnScope(){
    const mod = this.slaveModifier;
    const parent = this.context.currentElement!;

    if(!mod)
      return;

    const include =
      mod.alsoApplies.map(x => x.uid).join(" ");

    if(mod.sequence.length)
      parent.modifiers.push(mod);
    else
      this.usesClassname = "";

    if(include)
      if(this.usesClassname)
        this.usesClassname += " " + include;
      else
        this.usesClassname = include;
  }

  ReturnStatement(node: ReturnStatement){
    const arg = node.argument;
    const { context } = this;

    if(!this.test)
      throw Oops.ReturnElseNotImplemented(node)

    if(this.index !== 1)
      throw Oops.CanOnlyReturnFromLeadingIf(node)

    if(context.currentIf !== context.parentIf)
      throw Oops.CantReturnInNestedIf(node);

    if(!(context.currentElement instanceof ComponentExpression))
      throw Oops.CanOnlyReturnTopLevel(node);

    if(arg)
      if(isDoExpression(arg))
        (<DoExpressive>arg).meta = this;

      else if(isExpression(arg))
        this.Expression(arg);

    this.doesReturn = true;
  }

  LabeledStatement(node: LabeledStatement){
    const mod = this.slaveModifier || this.slaveNewModifier()
    super.LabeledStatement(node, null, mod);
  }

  private slaveNewModifier(){
    let { context } = this;

    const uid = hash(this.context.prefix)

    //TODO: Discover helpfulness of customized className.
    let selector = specifyOption(this.test) || `opt${this.index}`;
    selector += `_${uid}`;
    const parent = context.currentElement!;

    const mod = new ContingentModifier(
      context, parent, `.${selector}`
    );

    mod.priority = 5

    if(!context.currentIf!.hasStyleOutput)
      do {
        if(context.current instanceof ComponentIf)
          context.current.hasStyleOutput = true;
        else break;
      }
      while(context = context.parent)

    this.usesClassname = selector;
    return this.slaveModifier = mod;
  }
}

function specifyOption(test?: Expression){
  if(!test)
    return "else"

  let ref = "if_";

  if(isUnaryExpression(test, { operator: "!" })){
    test = test.argument;
    ref = "not_"
  }

  if(isIdentifier(test)){
    const { name } = test;
    return ref + name;
  }
}