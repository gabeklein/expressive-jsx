import { ElementInline } from 'handle';
import { applyNameImplications, parse, ParseContent } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
import type { ArrowFunctionExpression, DoExpression } from '@babel/types';
import type { StackFrame } from 'context';
import type { ComponentConsequent } from 'handle/switch';
import type { InnerContent, SequenceItem } from 'types';

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
      applyNameImplications(this, name);

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