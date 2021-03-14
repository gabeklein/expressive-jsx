import { blockStatement, returnStatement } from '@babel/types';
import { generateElement } from 'generate';
import { ComponentExpression } from 'handle';
import { meta } from 'shared';

import { recombineProps } from './es5';

import type { NodePath as Path } from '@babel/traverse';
import type { DoExpression } from '@babel/types';
import type { StackFrame } from 'context';
import type { ElementInline } from 'handle';

export function replaceDoExpression(path: Path<DoExpression>){
  const element = meta(path.node).meta as ElementInline;

  if(!(element instanceof ComponentExpression))
    return;

  const factory = generateElement(element);

  if(factory.children.length == 0 && element.exec === undefined){
    path.replaceWith(recombineProps(factory.props))
    return;
  }

  const context = element.context as StackFrame;
  const factoryExpression = context.Imports.container(factory);

  if(element.exec && element.statements.length){
    const replacement = [
      ...element.statements,
      returnStatement(factoryExpression)
    ];

    if(path.parentPath.isReturnStatement())
      path.parentPath.replaceWithMultiple(replacement)
    else
      path.replaceWith(blockStatement(replacement))
  }
  else {
    const prop = meta(path.node).expressive_parent;

    if(prop)
      prop.value = factoryExpression;
    else
      path.replaceWith(factoryExpression);
  }
}