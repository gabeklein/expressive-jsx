import { ElementInline, DefineComponent } from 'handle';
import { parse, ParseContent } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
import type { ArrowFunctionExpression, DoExpression } from '@babel/types';
import type { StackFrame } from 'context';
import type { ComponentConsequent } from 'handle/switch';
import type { InnerContent, SequenceItem } from 'types';

export class ComponentExpression2 {
  definition: DefineComponent;
  root: ElementInline;

  constructor(
    name: string,
    context: StackFrame,
    path: Path<DoExpression>,
    public exec?: Path<ArrowFunctionExpression>){

    const define = this.definition =
      new DefineComponent(context, name, path.get("body"));
    
    if(/^[A-Z]/.test(name))
      define.applyModifiers(name);

    define.context.currentComponent = this;

    const element = this.root = new ElementInline(context);

    element.name = name;
  }

  get statements(){
    return this.definition.statements;
  }

  add(item: SequenceItem){
    this.definition.add(item)
  }

  adopt(child: InnerContent){
    this.definition.adopt(child)
  }
}

export class ComponentExpression extends ElementInline {
  exec?: Path<ArrowFunctionExpression>;
  forwardTo?: ComponentConsequent;

  constructor(
    name: string,
    context: StackFrame,
    path: Path<DoExpression>,
    exec?: Path<ArrowFunctionExpression>){

    super(context);

    this.context.currentComponent = this;

    if(exec)
      this.exec = exec;

    this.name = name;
    this.explicitTagName = "div";

    if(/^[A-Z]/.test(name))
      this.applyModifiers(name);

    this.context.resolveFor(this.name);

    parse(this, ParseContent, path, "body");
  }

  add(item: SequenceItem){
    if(this.forwardTo)
      this.forwardTo.add(item)
    else
      super.add(item)
  }

  adopt(child: InnerContent){
    if(this.forwardTo){
      this.forwardTo.adopt(child)
      return
    }
    super.adopt(child)
  }
}