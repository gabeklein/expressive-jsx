import { DefineComponent } from 'handle';
import { parse, ParseContent } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
import type { ArrowFunctionExpression, DoExpression } from '@babel/types';
import type { StackFrame } from 'context';

export class ComponentExpression {
  definition: DefineComponent;

  constructor(
    name: string,
    context: StackFrame,
    path: Path<DoExpression>,
    public exec?: Path<ArrowFunctionExpression>){

    const body = path.get("body");

    const define = this.definition =
      new DefineComponent(context, name);

    define.context.currentComponent = this;

    parse(define, ParseContent, body);
  
    if(/^[A-Z]/.test(name))
      define.applyModifiers(name);
  }
}