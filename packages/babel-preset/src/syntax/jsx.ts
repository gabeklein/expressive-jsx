import { NodePath } from '@babel/traverse';
import { Expression, JSXElement } from '@babel/types';

import t from '../types';

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