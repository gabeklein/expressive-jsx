import {
  jsxAttribute,
  jsxClosingElement,
  jsxElement,
  jsxExpressionContainer,
  jsxIdentifier,
  jsxOpeningElement,
  jsxSpreadAttribute,
  jsxText,
} from '@babel/types';

import * as s from './';

import type * as t from '@babel/types';

type JSXReference = t.JSXIdentifier | t.JSXMemberExpression;

function jsxID<T extends JSXReference>(name: T): T;
function jsxID(name: string): t.JSXIdentifier;
function jsxID(name: string | JSXReference): JSXReference;
function jsxID(name: string | JSXReference){
  return typeof name == "string" ? jsxIdentifier(name) : name;
}

export function jsxCreate(
  tag: string | t.JSXMemberExpression,
  props: (t.JSXSpreadAttribute | t.JSXAttribute)[],
  children: t.Expression[]
){
  const type = jsxID(tag);
  const content = children.map(jsxContent);
  const contains = content.length > 0;

  const opening = jsxOpeningElement(type, props, !contains);
  const closing = contains ? jsxClosingElement(type) : undefined;

  return jsxElement(opening, closing, content);
}

export function jsxContent(child: t.Expression){
  if(s.assert(child, "JSXElement"))
    return child;

  if(s.assert(child, "StringLiteral") && !/\{/.test(child.value))
    return jsxText(child.value);

  return jsxExpressionContainer(child);
}

const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;

export function jsxAttr(value: t.Expression, name?: string | false){
  if(typeof name !== "string")
    return jsxSpreadAttribute(value);

  if(IsLegalAttribute.test(name) == false)
    throw new Error(`Illegal characters in prop named ${name}`)

  const jsxValue = s.assert(value, "StringLiteral")
    ? value.value === "true" ? null : value
    : jsxExpressionContainer(value)

  return jsxAttribute(jsxID(name), jsxValue);
}