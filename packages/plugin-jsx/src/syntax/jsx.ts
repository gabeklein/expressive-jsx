import { assert, create } from './nodes';

import type * as t from './types';

type JSXReference = t.JSXIdentifier | t.JSXMemberExpression;

export type JSXChild =
  | t.JSXElement
  | t.JSXFragment
  | t.JSXExpressionContainer
  | t.JSXSpreadChild
  | t.JSXText;

export const HTML_TAGS = [
  "article", "blockquote", "input",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "a", "ul", "ol", "li", "input",
  "i", "b", "em", "strong", "span",
  "hr", "img", "div", "br"
];

function jsxIdentifier<T extends JSXReference>(name: T): T;
function jsxIdentifier(name: string): t.JSXIdentifier;
function jsxIdentifier(name: string | JSXReference): JSXReference;
function jsxIdentifier(name: string | JSXReference){
  return typeof name == "string"
    ? create("JSXIdentifier", { name })
    : name;
}

export function jsxElement(
  tag: string | t.JSXMemberExpression,
  props: (t.JSXSpreadAttribute | t.JSXAttribute)[],
  children: t.Expression[]
){
  const type = jsxIdentifier(tag);
  const content = children.map(jsxContent);
  const contains = content.length > 0;

  const openingElement = create("JSXOpeningElement", {
    name: type,
    attributes: props,
    selfClosing: !contains,
    typeParameters: null
  });

  const closingElement = contains
    ? create("JSXClosingElement", { name: type })
    : null;

  return create("JSXElement", {
    openingElement,
    closingElement,
    children: content,
    selfClosing: !contains
  });
}

function jsxContent(child: t.Expression){
  if(assert(child, "JSXElement"))
    return child;

  if(assert(child, "StringLiteral") && !/\{/.test(child.value))
    return create("JSXText", { value: child.value });

  return create("JSXExpressionContainer", { expression: child });
}

const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;

export function jsxAttribute(value: t.Expression, name?: string | false){
  if(typeof name !== "string")
    return create("JSXSpreadAttribute", { argument: value });

  if(IsLegalAttribute.test(name) == false)
    throw new Error(`Illegal characters in prop named ${name}`)

  const jsxValue = assert(value, "StringLiteral")
    ? value.value === "true" ? null : value
    : create("JSXExpressionContainer", { expression: value })

  return create("JSXAttribute", {
    name: jsxIdentifier(name), value: jsxValue
  });
}