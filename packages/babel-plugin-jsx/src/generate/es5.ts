import * as t from 'syntax';
import { ArrayStack } from 'utility';

import type * as $ from 'types';
import type { FileManager } from 'scope';

export function createElement(
  this: FileManager,
  tag: null | string | $.JSXMemberExpression,
  properties: $.PropData[] = [],
  children: $.Expression[] = []
){
  const create =
    this.ensure("$pragma", "createElement", "create");

  if(!tag)
    tag = this.ensure("$pragma", "Fragment").name;

  const props = recombineProps(properties);
  const type = typeof tag === "string"
    ? /^[A-Z]/.test(tag)
      ? t.identifier(tag)
      : t.literal(tag)
    : stripJSX(tag);

  return t.call(create, type, props, ...children);
}

export function recombineProps(props: $.PropData[]){
  const propStack = new ArrayStack<$.ObjectProperty, $.Expression>()

  if(props.length === 0)
    return t.object();

  for(const { name, value } of props)
    if(!name)
      propStack.push(value);
    else
      propStack.insert(
        t.property(name, value)
      );

  const properties = propStack.map(chunk =>
    Array.isArray(chunk) ? t.object(chunk) : chunk
  )

  if(properties[0].type !== "ObjectExpression")
    properties.unshift(t.object())

  return properties.length > 1
    ? t.objectAssign(...properties)
    : properties[0];
}

function stripJSX(
  exp: $.JSXMemberExpression | $.JSXIdentifier | $.Identifier
): $.MemberExpression | $.Identifier {

  switch(exp.type){
    case "Identifier":
      return exp;
    case "JSXIdentifier":
      return t.identifier(exp.name);
    case "JSXMemberExpression":
      return t.member(stripJSX(exp.object), stripJSX(exp.property));
    default:
      throw new Error("Bad MemberExpression");
  }
}