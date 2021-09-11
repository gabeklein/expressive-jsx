import * as t from 'syntax';

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

  const type = typeof tag == "string" ? t.jsxIdentifier(tag) : tag;
  const props = properties.map(createAttribute);
  const children = content.map(jsxContent);

  this.ensure("$pragma", "default", "React");

  const contains = children.length > 0;

  return t.jsxElement(
    t.jsxOpeningElement(type, props, !contains),
    contains ? t.jsxClosingElement(type) : undefined,
    children
  );
}

function jsxContent(child: t.Expression){
  if(t.isJSXElement(child))
    return child;

  if(t.isStringLiteral(child) && !/\{/.test(child.value))
    return t.jsxText(child.value);

  return t.jsxExpressionContainer(child);
}

function createAttribute({ name, value }: PropData){
  if(typeof name !== "string")
    return t.jsxSpreadAttribute(value);

  if(IsLegalAttribute.test(name) == false)
    throw new Error(`Illegal characters in prop named ${name}`)

  return t.jsxAttribute(
    t.jsxIdentifier(name), 
    t.isStringLiteral(value)
      ? value.value === "true"
        ? null : value
      : t.jsxExpressionContainer(value)
  )
}