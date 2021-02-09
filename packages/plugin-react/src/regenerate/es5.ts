import {
  booleanLiteral,
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
  StringLiteral,
  stringLiteral,
} from '@babel/types';
import { dedent, GenerateReact } from 'regenerate';
import { _object, _objectAssign } from 'syntax';
import { ArrayStack, ElementReact } from 'translate';
import { ContentLike, PropData } from 'types';

export class GenerateES extends GenerateReact {

  element(src: ElementReact){
    const { tagName: tag, props, children } = src;

    const type =
      typeof tag === "string" ?
        /^[A-Z]/.test(tag) ?
          identifier(tag) :
          stringLiteral(tag) :
        stripJSX(tag);

    return this.createElement(type, props, children);
  }

  fragment(
    children = [] as ContentLike[],
    key?: Expression
  ){
    let props = key && [{ name: "key", value: key }];
    return this.createElement(null, props, children)
  }

  private createElement(
    type: null | Identifier | StringLiteral | MemberExpression,
    props: PropData[] = [],
    children: ContentLike[] = []
  ){
    const { Imports } = this;

    const create =
      Imports.ensure("$pragma", "createElement", "create");

    if(type === null)
      type = Imports.ensure("$pragma", "Fragment");

    const inner = this.recombineChildren(children);

    return callExpression(create, [
      type, recombineProps(props), ...inner
    ]);
  }

  private recombineChildren(input: ContentLike[]): Expression[] {
    return input.map(child => (
      "toExpression" in child ?
        child.toExpression(this) :
      isExpression(child) ?
        isTemplateLiteral(child) ?
          dedent(child) :
        child :
      child instanceof ElementReact
        ? this.element(child)
        : booleanLiteral(false)
    ));
  }
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