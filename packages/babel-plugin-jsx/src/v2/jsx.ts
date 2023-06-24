import * as t from 'syntax';

import { Context } from './context';

export function applyModifier(context: Context, element: t.JSXElement){
  const { define } = context;

  element.openingElement.attributes.push(
    t.jsxAttribute(t.jsxIdentifier("className"),
    t.literal(define.uid))
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