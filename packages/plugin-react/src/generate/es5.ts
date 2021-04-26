import { ArrayStack } from 'generate/attributes';
import * as t from 'syntax';

import type { StackFrame } from 'context';
import type { PropData } from 'types';
import type {
  Expression,
  Identifier,
  JSXIdentifier,
  JSXMemberExpression,
  MemberExpression,
  ObjectProperty
} from 'syntax';

export function createElement(
  this: StackFrame,
  tag: null | string | JSXMemberExpression,
  properties: PropData[] = [],
  children: Expression[] = []
){
  const create =
    this.program.ensure("$pragma", "createElement", "create");

  if(!tag)
    tag = this.program.ensure("$pragma", "Fragment").name;

  const type =
    typeof tag === "string" ?
      /^[A-Z]/.test(tag) ?
        t.identifier(tag) :
        t.stringLiteral(tag) :
      stripJSX(tag);

  const props = recombineProps(properties);

  return t.callExpression(create, [type, props, ...children]);
}

export function recombineProps(props: PropData[]){
  const propStack = new ArrayStack<ObjectProperty, Expression>()

  if(props.length === 0)
    return t.object();

  for(const { name, value } of props)
    if(!name)
      propStack.push(value);
    else
      propStack.insert(
        t.objectProperty(
          t.stringLiteral(name),
          value
        )
      );

  const properties = propStack.map(chunk =>
    Array.isArray(chunk)
      ? t.objectExpression(chunk)
      : chunk
  )

  if(properties[0].type !== "ObjectExpression")
    properties.unshift(t.object())

  return properties.length > 1
    ? t.objectAssign(...properties)
    : properties[0];
}

function stripJSX(
  exp: JSXMemberExpression | JSXIdentifier | Identifier
): MemberExpression | Identifier {

  switch(exp.type){
    case "Identifier":
      return exp;
    case "JSXIdentifier":
      return t.identifier(exp.name);
    case "JSXMemberExpression":
      return t.memberExpression(
        stripJSX(exp.object),
        stripJSX(exp.property)
      );
    default:
      throw new Error("Bad MemeberExpression");
  }
}