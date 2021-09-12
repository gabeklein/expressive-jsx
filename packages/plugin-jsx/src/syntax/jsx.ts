import * as s from './';
import * as t from '@babel/types';

type JSXReference = t.JSXIdentifier | t.JSXMemberExpression;

function jsxIdentifier<T extends JSXReference>(name: T): T;
function jsxIdentifier(name: string): t.JSXIdentifier;
function jsxIdentifier(name: string | JSXReference): JSXReference;
function jsxIdentifier(name: string | JSXReference){
  return typeof name == "string" ? t.jsxIdentifier(name) : name;
}

export function jsxElement(
  tag: string | t.JSXMemberExpression,
  props: (t.JSXSpreadAttribute | t.JSXAttribute)[],
  children: t.Expression[]
){
  const type = jsxIdentifier(tag);
  const content = children.map(jsxContent);
  const contains = content.length > 0;

  const opening = t.jsxOpeningElement(type, props, !contains);
  const closing = contains ? t.jsxClosingElement(type) : undefined;

  return t.jsxElement(opening, closing, content);
}

export function jsxContent(child: t.Expression){
  if(s.assert(child, "JSXElement"))
    return child;

  if(s.assert(child, "StringLiteral") && !/\{/.test(child.value))
    return t.jsxText(child.value);

  return t.jsxExpressionContainer(child);
}

const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;

export function jsxAttribute(value: t.Expression, name?: string | false){
  if(typeof name !== "string")
    return t.jsxSpreadAttribute(value);

  if(IsLegalAttribute.test(name) == false)
    throw new Error(`Illegal characters in prop named ${name}`)

  const jsxValue = s.assert(value, "StringLiteral")
    ? value.value === "true" ? null : value
    : t.jsxExpressionContainer(value)

  return t.jsxAttribute(jsxIdentifier(name), jsxValue);
}