import { blockStatement, returnStatement } from '@babel/types';

import type { NodePath as Path } from '@babel/traverse';
import type { DoExpression } from '@babel/types';
import type { DefineContainer } from 'handle';

export function replaceDoExpression(
  path: Path<DoExpression>,
  element: DefineContainer){

  const { exec, statements } = element;

  const output = element.toExpression();

  if(exec && statements.length){
    const body = [
      ...statements,
      returnStatement(output)
    ];

    if(path.parentPath.isReturnStatement())
      path.parentPath.replaceWithMultiple(body)
    else
      path.replaceWith(blockStatement(body))
  }
  else
    path.replaceWith(output);
}