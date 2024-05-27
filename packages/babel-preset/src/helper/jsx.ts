import { NodePath } from '@babel/traverse';
import { Expression, JSXElement } from '@babel/types';

import { Options } from '..';
import { Context } from '../plugin';
import t from '../types';
import { importPolyfill } from './importPolyfill';
import { HTML_TAGS } from './tags';

/** TODO: Move to a default handler included with macros. */
export function fixTagName(path: any){
  const { name } = path.node.openingElement;

  if(t.isJSXIdentifier(name)
  && !/^[A-Z]/.test(name.name)
  && !HTML_TAGS.includes(name.name))
    setTagName(path, "div");
}

export function getClassName(
  context: Context,
  module?: Expression
): Expression | undefined {
  if(!context.props.size && !context.children.size)
    return;

  const { condition, alternate, uid } = context;

  if(typeof condition == "string" || t.isStringLiteral(condition))
    return;

  const value = module
    ? t.memberExpression(module, t.identifier(uid), false)
    : t.stringLiteral(uid);

  if(!condition)
    return value;

  if(alternate){
    let alt = getClassName(alternate, module);

    if(typeof alt === "string")
      alt = t.stringLiteral(alt);

    if(alt)
      return t.conditionalExpression(condition, value, alt);
  }

  return t.logicalExpression("&&", condition, value);
}

export function addClassName(
  path: NodePath<JSXElement>,
  name: string | Expression,
  options: Options) {

  const existing = hasProp(path, "className");
  const opening = path.get("openingElement");

  if(typeof name == "string")
    name = t.stringLiteral(name);

  if(t.isStringLiteral(existing) && t.isStringLiteral(name)) {
    existing.value += " " + name.value;
    return;
  }

  if(!existing) {
    opening.pushContainer(
      "attributes",
      t.jsxAttribute(
        t.jsxIdentifier("className"),
        t.isStringLiteral(name)
          ? name : t.jsxExpressionContainer(name)
      )
    );
    return;
  }

  const concat = importPolyfill("classNames", path, options);

  if(t.isCallExpression(existing)
    && t.isIdentifier(existing.callee, { name: concat.name }))
    if(t.isStringLiteral(name)) {
      for(const value of existing.arguments)
        if(t.isStringLiteral(value)) {
          value.value += " " + name.value;
          return;
        }
    }
    else {
      existing.arguments.push(name);
      return;
    }

  for(const attr of opening.get("attributes"))
    if(attr.isJSXAttribute()
    && attr.get("name").isJSXIdentifier({ name: "className" })) {
      attr.node.value = t.jsxExpressionContainer(
        t.callExpression(concat, [name, existing])
      );
      return;
    }

  throw new Error("Could not insert className");
}

export function spreadProps(path: NodePath<JSXElement>, props: Expression){
  path
    .get("openingElement")
    .unshiftContainer("attributes", t.jsxSpreadAttribute(props))
}

export function setTagName(path: NodePath<JSXElement>, name: string){
  const { openingElement, closingElement } = path.node;
  const tag = t.jsxIdentifier(name);

  openingElement.name = tag;

  if(closingElement)
    closingElement.name = tag;
}

export function hasProp(path: NodePath<JSXElement>, name: string){
  for(const attr of path.node.openingElement.attributes)
    if(t.isJSXAttribute(attr) && attr.name.name === name){
      const { value } = attr;

      if(t.isJSXExpressionContainer(value) && t.isExpression(value.expression))
        return value.expression;

      if(t.isExpression(value))
        return value;
    }
}