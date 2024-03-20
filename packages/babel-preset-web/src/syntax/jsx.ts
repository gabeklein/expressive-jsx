import { NodePath } from '@babel/traverse';
import { JSXElement } from '@babel/types';

import t from '../types';

export function getNames(path: NodePath<JSXElement>) {
  const names = new Map<string, NodePath>();
  const opening = path.get("openingElement");
  let tag = opening.get("name");

  while (tag.isJSXMemberExpression()) {
    names.set(tag.get("property").toString(), tag);
    tag = tag.get("object");
  }

  if (tag.isJSXIdentifier())
    names.set(tag.toString(), tag);

  opening.get("attributes").forEach(attr => {
    if (!attr.isJSXAttribute() || attr.node.value)
      return;

    let { name } = attr.node.name;

    if (typeof name !== "string")
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