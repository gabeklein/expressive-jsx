import { ComponentContainer } from 'handle';
import { applyNameImplications } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
import type { ArrowFunctionExpression, DoExpression, Statement } from '@babel/types';
import type { StackFrame } from 'context';
import type { ComponentConsequent } from 'handle/switch';
import type { InnerContent, SequenceItem } from 'types';
import { meta } from 'shared';

export class ComponentExpression extends ComponentContainer {
  exec?: Path<ArrowFunctionExpression>;
  statements = [] as Statement[];
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

    meta(path.node, this);
    this.context.resolveFor(this.name);
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