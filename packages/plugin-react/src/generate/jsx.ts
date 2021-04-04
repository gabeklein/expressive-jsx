import {
  isExpression,
  isJSXElement,
  isStringLiteral,
  jsxAttribute,
  jsxClosingElement,
  jsxElement,
  jsxExpressionContainer,
  jsxIdentifier,
  jsxOpeningElement,
  jsxSpreadAttribute,
  jsxText,
} from '@babel/types';
import { IsLegalAttribute } from 'types';

import type { JSXElement, JSXMemberExpression, Expression } from '@babel/types';
import type { StackFrame } from 'context';
import type { JSXContent, PropData } from 'types';

export function createElement(
  this: StackFrame,
  tag: null | string | JSXMemberExpression,
  properties: PropData[] = [],
  content: Expression[] = [],
  acceptBr?: boolean
): JSXElement {
  const { Imports } = this;

  if(acceptBr === undefined)
    acceptBr = !tag || typeof tag == "string" && /^[a-z]/.test(tag);

  if(!tag)
    tag = Imports.ensure("$pragma", "Fragment").name;

  const type = typeof tag == "string" ? jsxIdentifier(tag) : tag;
  const props = properties.map(createAttribute);
  const children = [] as JSXContent[];

  for(let child of content)
    children.push(
      isJSXElement(child) ?
        child :
      isStringLiteral(child) && !/\{/.test(child.value) ?
        jsxText(child.value) :
      isExpression(child) ?
        jsxExpressionContainer(child) :
      child
    )

  Imports.ensure("$pragma", "default", "React");

  const contains = children.length > 0;

  return jsxElement(
    jsxOpeningElement(type, props, !contains),
    contains ? jsxClosingElement(type) : undefined,
    children
  );
}

function createAttribute({ name, value }: PropData){
  if(typeof name !== "string")
    return jsxSpreadAttribute(value);

  if(IsLegalAttribute.test(name) == false)
    throw new Error(`Illegal characters in prop named ${name}`)

  const insertedValue =
    isStringLiteral(value)
      ? value.value === "true" ? null : value
      : jsxExpressionContainer(value)

  return jsxAttribute(
    jsxIdentifier(name),
    insertedValue
  )
}