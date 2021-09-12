import * as s from 'syntax';

import type * as t from 'syntax/types';
import type { FileManager } from 'scope';
import type { PropData } from 'types';

const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;

export function createElement(
  this: FileManager,
  tag: null | string | t.JSXMemberExpression,
  properties: PropData[] = [],
  content: t.Expression[] = []
){
  if(!tag)
    tag = this.ensure("$pragma", "Fragment").name;

  const type = typeof tag == "string" ? s.jsxIdentifier(tag) : tag;
  const props = properties.map(createAttribute);
  const children = content.map(jsxContent);

  this.ensure("$pragma", "default", "React");

  const contains = children.length > 0;

  return s.jsxElement(
    s.jsxOpeningElement(type, props, !contains),
    contains ? s.jsxClosingElement(type) : undefined,
    children
  );
}

function jsxContent(child: t.Expression){
  if(child.type == "JSXElement")
    return child;

  if(child.type == "StringLiteral" && !/\{/.test(child.value))
    return s.jsxText(child.value);

  return s.jsxExpressionContainer(child);
}

function createAttribute({ name, value }: PropData){
  if(typeof name !== "string")
    return s.jsxSpreadAttribute(value);

  if(IsLegalAttribute.test(name) == false)
    throw new Error(`Illegal characters in prop named ${name}`)

  return s.jsxAttribute(
    s.jsxIdentifier(name), 
    value.type == "StringLiteral"
      ? value.value === "true" ? null : value
      : s.jsxExpressionContainer(value)
  )
}