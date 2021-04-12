import * as t from '@babel/types';
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
  const { Scope } = this;

  if(acceptBr === undefined)
    acceptBr = !tag || typeof tag == "string" && /^[a-z]/.test(tag);

  if(!tag)
    tag = Scope.ensure("$pragma", "Fragment").name;

  const type = typeof tag == "string" ? t.jsxIdentifier(tag) : tag;
  const props = properties.map(createAttribute);
  const children = [] as JSXContent[];

  for(let child of content)
    children.push(
      t.isJSXElement(child) ?
        child :
      t.isStringLiteral(child) && !/\{/.test(child.value) ?
        t.jsxText(child.value) :
      t.isExpression(child) ?
        t.jsxExpressionContainer(child) :
      child
    )

  Scope.ensure("$pragma", "default", "React");

  const contains = children.length > 0;

  return t.jsxElement(
    t.jsxOpeningElement(type, props, !contains),
    contains ? t.jsxClosingElement(type) : undefined,
    children
  );
}

function createAttribute({ name, value }: PropData){
  if(typeof name !== "string")
    return t.jsxSpreadAttribute(value);

  if(IsLegalAttribute.test(name) == false)
    throw new Error(`Illegal characters in prop named ${name}`)

  const insertedValue =
    t.isStringLiteral(value)
      ? value.value === "true" ? null : value
      : t.jsxExpressionContainer(value)

  return t.jsxAttribute(
    t.jsxIdentifier(name),
    insertedValue
  )
}