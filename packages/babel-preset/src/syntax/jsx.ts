import { NodePath } from '@babel/traverse';
import { Expression, JSXElement } from '@babel/types';

import t from '../types';
import { getHelper } from './program';

export function getNames(path: NodePath<JSXElement>) {
  const names = new Map<string, NodePath>();
  const opening = path.get("openingElement");
  let tag = opening.get("name");

  while(tag.isJSXMemberExpression()) {
    names.set(tag.get("property").toString(), tag);
    tag = tag.get("object");
  }

  if(tag.isJSXIdentifier())
    names.set(tag.toString(), tag);

  opening.get("attributes").forEach(attr => {
    if(!attr.isJSXAttribute() || attr.node.value)
      return;

    let { name } = attr.node.name;

    if(typeof name !== "string")
      name = name.name;

    names.set(name, attr);
  });

  return names;
}

export function fixImplicitReturn(path: NodePath<JSXElement>){
  let { node, parentPath: parent } = path;

  if(!parent.isExpressionStatement())
    return false;

  const block = parent.parentPath;

  if(block.isBlockStatement()
  && block.get("body").length == 1
  && block.parentPath.isArrowFunctionExpression())
    block.replaceWith(t.parenthesizedExpression(node));
  else
    parent.replaceWith(t.returnStatement(node));

  path.skip();
  return true;
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

export function addClassName(
  path: NodePath<JSXElement>,
  name: string | Expression,
  polyfill?: string | null){

  const existing = hasProp(path, "className");
  const opening = path.get("openingElement")

  if(typeof name == "string")
    name = t.stringLiteral(name);

  if(t.isStringLiteral(existing) && t.isStringLiteral(name)){
    existing.value += " " + name.value;
    return;
  }

  if(!existing){
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
    if(t.isStringLiteral(name)){
      for(const value of existing.arguments)
        if(t.isStringLiteral(value)){
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
    && attr.get("name").isJSXIdentifier({ name: "className" })){
      attr.node.value = t.jsxExpressionContainer(
        t.callExpression(concat, [name, existing])
      )
      return;
    }

  throw new Error("Could not insert className");
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