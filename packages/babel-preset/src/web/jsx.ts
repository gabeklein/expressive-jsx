import { NodePath } from '@babel/traverse';
import { Expression, JSXElement } from '@babel/types';

import { Context } from '../context';
import { hasProp, setTagName } from '../syntax/jsx';
import { getHelper } from '../syntax/program';
import { HTML_TAGS } from './tags';
import t from '../types';

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
  polyfill?: string | null) {

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

  const concat = getHelper("classNames", path, polyfill);

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
