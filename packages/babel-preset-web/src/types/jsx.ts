import {
  Expression,
  JSXAttribute,
  JSXElement,
  JSXExpressionContainer,
  JSXFragment,
  JSXIdentifier,
  JSXMemberExpression,
  JSXSpreadAttribute,
  JSXSpreadChild,
  JSXText,
} from '@babel/types';

import { t } from '.';

type JSXReference = JSXIdentifier | JSXMemberExpression;

export type JSXChild =
  | JSXElement
  | JSXFragment
  | JSXExpressionContainer
  | JSXSpreadChild
  | JSXText;

function jsxIdentifier<T extends JSXReference>(name: T): T;
function jsxIdentifier(name: string): JSXIdentifier;
function jsxIdentifier(name: string | JSXReference): JSXReference;
function jsxIdentifier(name: string | JSXReference){
  return typeof name == "string"
    ? t.jsxIdentifier(name)
    : name;
}

export function jsxTag(
  tag: string | JSXMemberExpression,
  props: (JSXSpreadAttribute | JSXAttribute)[],
  children: Expression[]
){
  const type = jsxIdentifier(tag);
  const content = children.map(jsxContent);
  const contains = content.length > 0;

  const openingElement = t.jsxOpeningElement(type, props, !contains);
  const closingElement = contains ? t.jsxClosingElement(type) : null;

  return t.jsxElement(openingElement, closingElement, content, !contains);
}

function jsxContent(child: Expression){
  if(t.isJSXElement(child))
    return child;

  if(t.isStringLiteral(child) && !/\{/.test(child.value))
    return t.jsxText(child.value);

  return t.jsxExpressionContainer(child);
}