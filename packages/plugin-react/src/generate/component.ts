import { blockStatement, returnStatement } from '@babel/types';
import { generateElement } from 'generate';

import { recombineProps } from './es5';

import type { ComponentExpression } from 'handle';

import type { NodePath as Path } from '@babel/traverse';
import type { DoExpression } from '@babel/types';
import type { StackFrame } from 'context';

export function replaceDoExpression(
  path: Path<DoExpression>,
  element: ComponentExpression){

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
  else
    path.replaceWith(factoryExpression);
}