import * as t from 'syntax';

import { Context } from './context';

export function applyModifier(context: Context, element: t.JSXElement){
  const { className } = context.define;

  if(className)
  element.openingElement.attributes.push(
    t.jsxAttribute(t.jsxIdentifier("className"),
    t.literal(className))
  )
}

export function isImplicitReturn(path: t.Path<t.JSXElement> | t.Path<t.JSXFragment>){
  const parent = path.parentPath;

  if(!parent.isExpressionStatement() || !parent.parentPath!.parentPath!.isFunction())
    return false;

  parent.replaceWith(t.returns(path.node));
  path.skip();

  return true;
}