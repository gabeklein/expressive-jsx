import * as t from '../types';

type JSXReference = t.JSXIdentifier | t.JSXMemberExpression;

export type JSXChild =
  | t.JSXElement
  | t.JSXFragment
  | t.JSXExpressionContainer
  | t.JSXSpreadChild
  | t.JSXText;

function jsxIdentifier<T extends JSXReference>(name: T): T;
function jsxIdentifier(name: string): t.JSXIdentifier;
function jsxIdentifier(name: string | JSXReference): JSXReference;
function jsxIdentifier(name: string | JSXReference){
  return typeof name == "string"
    ? t.jsxIdentifier(name)
    : name;
}

export function jsxTag(
  tag: string | t.JSXMemberExpression,
  props: (t.JSXSpreadAttribute | t.JSXAttribute)[],
  children: t.Expression[]
){
  const type = jsxIdentifier(tag);
  const content = children.map(jsxContent);
  const contains = content.length > 0;

  const openingElement = t.jsxOpeningElement(type, props, !contains);
  const closingElement = contains ? t.jsxClosingElement(type) : null;

  return t.jsxElement(openingElement, closingElement, content, !contains);
}

function jsxContent(child: t.Expression){
  if(t.isJSXElement(child))
    return child;

  if(t.isStringLiteral(child) && !/\{/.test(child.value))
    return t.jsxText(child.value);

  return t.jsxExpressionContainer(child);
}