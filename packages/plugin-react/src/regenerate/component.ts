import { blockStatement, returnStatement, stringLiteral } from '@babel/types';
import { ComponentExpression } from 'handle';
import { meta } from 'shared';
import { _object } from 'syntax';
import { ElementReact } from 'translate';

import type { NodePath as Path } from '@babel/traverse';
import type { DoExpression ,Expression } from '@babel/types';
import type { StackFrame } from 'context';

export function replaceDoExpression(path: Path<DoExpression>){
  const element = meta(path.node).meta;

  if(element.didExitOwnScope)
    element.didExitOwnScope();

  if(!(element instanceof ComponentExpression))
    return;

  const factory = new ElementReact(element);

  if(factory.children.length == 0 && element.exec === undefined){
    path.replaceWith(asOnlyAttributes(factory))
    return;
  }

  const context = element.context as StackFrame;
  const factoryExpression = context.Imports.container(factory);

  // if(meta instanceof ComponentExpression && meta.exec)
  //     incorperateChildParameters(meta, state.context.Imports)

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

function asOnlyAttributes(factory: ElementReact){
  const classNames = factory.classList as string[];
  let style: Expression | undefined;

  for(const prop of factory.props)
    if(prop.name == "style")
      style = prop.value || _object();

  return _object({
    className: stringLiteral(
      classNames.join(" ")
    ),
    style
  })
}