import * as t from '@babel/types';
import { ArrayStack } from 'generate';
import { _object, _objectAssign } from 'syntax';

import type {
  CallExpression,
  Expression,
  Identifier,
  JSXIdentifier,
  JSXMemberExpression,
  MemberExpression,
  ObjectProperty
} from '@babel/types';
import type { StackFrame } from 'context';
import type { PropData } from 'types';

export function createElement(
  this: StackFrame,
  tag: null | string | JSXMemberExpression,
  properties: PropData[] = [],
  content: Expression[] = []
): CallExpression {
  const { Scope } = this;

  const create =
    Scope.ensure("$pragma", "createElement", "create");

  if(!tag)
    tag = Scope.ensure("$pragma", "Fragment").name;

  const type =
    typeof tag === "string" ?
      /^[A-Z]/.test(tag) ?
        t.identifier(tag) :
        t.stringLiteral(tag) :
      stripJSX(tag);

  const props = recombineProps(properties);
  const children = [] as Expression[];

  for(let child of content)
    children.push(
      t.isExpression(child) ?
        child :
      t.booleanLiteral(false)
    )

  return t.callExpression(create, [type, props, ...children]);
}

export function recombineProps(props: PropData[]){
  const propStack = new ArrayStack<ObjectProperty, Expression>()

  if(props.length === 0)
    return _object();

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
    properties.unshift(_object())

  return properties.length > 1
    ? _objectAssign(...properties)
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