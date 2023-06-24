import * as $ from 'syntax';
import { ArrayStack } from 'utility';

import * as t from 'syntax/types';
import type { FileManager } from 'scope';
import type { PropData } from 'types';

export function createElement(
  this: FileManager,
  tag: null | string | t.JSXMemberExpression,
  properties: PropData[] = [],
  children: t.Expression[] = []
){
  const create =
    this.ensure("$pragma", "createElement", "create");

  if(!tag)
    tag = this.ensure("$pragma", "Fragment").name;

  const props = recombineProps(properties);
  const type = typeof tag === "string"
    ? /^[A-Z]/.test(tag)
      ? t.identifier(tag)
      : $.literal(tag)
    : stripJSX(tag);

  return $.call(create, type, props, ...children);
}

export function recombineProps(props: PropData[]){
  const propStack = new ArrayStack<t.ObjectProperty, t.Expression>()

  if(props.length === 0)
    return $.object();

  for(const { name, value } of props)
    if(!name)
      propStack.push(value);
    else
      propStack.insert(
        $.property(name, value)
      );

  const properties = propStack.map(chunk =>
    Array.isArray(chunk) ? $.object(chunk) : chunk
  )

  if(properties[0].type !== "ObjectExpression")
    properties.unshift($.object())

  return properties.length > 1
    ? $.objectAssign(...properties)
    : properties[0];
}

function stripJSX(
  exp: t.JSXMemberExpression | t.JSXIdentifier | t.Identifier
): t.MemberExpression | t.Identifier {

  switch(exp.type){
    case "Identifier":
      return exp;
    case "JSXIdentifier":
      return t.identifier(exp.name);
    case "JSXMemberExpression":
      return $.member(stripJSX(exp.object), stripJSX(exp.property));
    default:
      throw new Error("Bad MemberExpression");
  }
}