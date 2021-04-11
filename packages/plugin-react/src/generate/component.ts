import { blockStatement, returnStatement } from '@babel/types';
import { generateEntryElement } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
import type { DoExpression } from '@babel/types';
import type { StackFrame } from 'context';
import type { BabelState } from 'types';

export function replaceDoExpression(
  path: Path<DoExpression>,
  state: BabelState<StackFrame>){

  let element = generateEntryElement(path, state.context);

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