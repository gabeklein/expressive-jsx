import { ElementInline, DefineComponent } from 'handle';

import type { NodePath as Path } from '@babel/traverse';
import type { ArrowFunctionExpression, DoExpression } from '@babel/types';
import type { StackFrame } from 'context';

export class ComponentExpression {
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
}