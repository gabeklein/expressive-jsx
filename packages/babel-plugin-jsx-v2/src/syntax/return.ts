import * as t from '../types';

export function fixImplicitReturn(path: t.NodePath<t.Expression>){
  const statement = path.parentPath;
  const block = statement.parentPath!;

  if(!block.isBlockStatement())
    return;

  const within = block.parentPath as t.NodePath;
  const inserted =
    block.node.body.length === 1 &&
    within.isArrowFunctionExpression()
      ? block.replaceWith(t.parenthesizedExpression(path.node))
      : statement.replaceWith(t.returns(path.node));

  inserted[0].skip();
}