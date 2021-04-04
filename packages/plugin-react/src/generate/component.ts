import { blockStatement, returnStatement } from '@babel/types';
import { generateElement } from 'generate';

import { recombineProps } from './es5';

import type { NodePath as Path } from '@babel/traverse';
import type { DoExpression } from '@babel/types';
import type { ComponentExpression2 } from 'handle';

export function replaceDoExpression(
  path: Path<DoExpression>,
  element: ComponentExpression2){

  const { exec, definition, root } = element;
  const { children, statements } = definition;

  root.applyModifier(definition);

  if(exec === undefined && children.length == 0){
    const factory = generateElement(root);
    const properties = recombineProps(factory.props);
    path.replaceWith(properties);
    return;
  }

  const factoryExpression = root.toExpression(true);

  if(exec && statements.length){
    const replacement = [
      ...statements,
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