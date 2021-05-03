import * as t from 'syntax';

import type { FileManager } from 'scope';
import type { JSXMemberExpression, Expression } from 'syntax';
import type { PropData } from 'types';

const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;
const IsLocalFilePath = /^\.\/.*?\.[\w:]+$/;

export function createElement(
  this: FileManager,
  tag: null | string | JSXMemberExpression,
  properties: PropData[] = [],
  content: Expression[] = []
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

function jsxContent(child: Expression){
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

  const insertedValue =
    t.isStringLiteral(value)
      ? value.value === "true" ? null
      : IsLocalFilePath.test(value.value)
          ? t.jsxExpressionContainer(t.require(value.value))
          : value
      : t.jsxExpressionContainer(value)

  return t.jsxAttribute(t.jsxIdentifier(name), insertedValue)
}