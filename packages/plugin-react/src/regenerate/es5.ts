import {
  booleanLiteral,
  CallExpression,
  callExpression,
  Expression,
  Identifier,
  identifier,
  isExpression,
  isTemplateLiteral,
  JSXIdentifier,
  JSXMemberExpression,
  MemberExpression,
  memberExpression,
  objectExpression,
  ObjectProperty,
  objectProperty,
  stringLiteral,
} from '@babel/types';
import { StackFrame } from 'context';
import { dedent } from 'deprecate';
import { _object, _objectAssign } from 'syntax';
import { ArrayStack, ElementReact } from 'translate';
import { ContentLike, PropData } from 'types';

export function createElement(
  this: StackFrame,
  tag: null | string | JSXMemberExpression,
  properties: PropData[] = [],
  content: ContentLike[] = []
): CallExpression {
  const { Imports } = this;

  const create =
    Imports.ensure("$pragma", "createElement", "create");

  if(!tag)
    tag = Imports.ensure("$pragma", "Fragment").name;

  const type =
    typeof tag === "string" ?
      /^[A-Z]/.test(tag) ?
        identifier(tag) :
        stringLiteral(tag) :
      stripJSX(tag);

  const props = recombineProps(properties);
  const children = [] as Expression[];

  for(let child of content){

    if("toExpression" in child)
      child = child.toExpression(this);

    if(child instanceof ElementReact)
      return createElement.call(
        this,
        child.tagName, 
        child.props, 
        child.children
      );

      children.push(
      isTemplateLiteral(child) ? dedent(child) :
      isExpression(child) ? child :
      booleanLiteral(false)
    )
  }

  return callExpression(create, [type, props, ...children]);
}

function recombineProps(props: PropData[]){
  const propStack = new ArrayStack<ObjectProperty, Expression>()

  if(props.length === 0)
    return _object();

  for(const { name, value } of props)
    if(!name)
      propStack.push(value);
    else
      propStack.insert(
        objectProperty(
          stringLiteral(name),
          value
        )
      );

  const properties = propStack.map(chunk =>
    Array.isArray(chunk)
      ? objectExpression(chunk)
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
      return identifier(exp.name);
    case "JSXMemberExpression":
      return memberExpression(
        stripJSX(exp.object),
        stripJSX(exp.property)
      );
    default:
      throw new Error("Bad MemeberExpression");
  }
}