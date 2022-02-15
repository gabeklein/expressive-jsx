import * as s from 'syntax';

import { getLocalFilename } from './filename';

import type * as t from 'syntax/types';

type FunctionPath =
  | t.Path<t.ClassMethod>
  | t.Path<t.ObjectMethod>
  | t.Path<t.FunctionDeclaration>
  | t.Path<t.FunctionExpression>

export function parentFunction(path: t.Path<t.DoExpression>){
  const parent = path.parentPath;

  if(s.assert(parent, "ArrowFunctionExpression"))
    return parent;

  if(s.assert(parent, "ReturnStatement")){
    const container = parent.findParent(x => /.*Function.*/.test(x.type))!;

    if(s.assert(container, "ArrowFunctionExpression"))
      return container as t.Path<t.ArrowFunctionExpression>;
  }
}

export function containerName(path: t.Path): string {
  let parent = path.parentPath;
  let encounteredReturn;

  while(true)
  switch(parent.type){
    case "VariableDeclarator": {
      const { id } = parent.node as t.VariableDeclarator;
      return s.assert(id, "Identifier")
        ? id.name
        : (<t.VariableDeclaration>parent.parentPath.node).kind
    }

    case "AssignmentExpression":
    case "AssignmentPattern": {
      const { left } = parent.node as t.AssignmentExpression;
      return s.assert(left, "Identifier") ? left.name : "assignment"
    }

    case "FunctionDeclaration":
      return (<t.FunctionDeclaration>path.node).id!.name;

    case "ExportDefaultDeclaration":
      return getLocalFilename(path.hub);

    case "ArrowFunctionExpression": {
      parent = parent.parentPath;
      continue;
    }

    case "ReturnStatement": {
      if(encounteredReturn)
        return "return";

      encounteredReturn = path;
      const ancestry = path.getAncestry();
      const within = ancestry.find((x)=> x.isFunction()) as FunctionPath | undefined;

      if(!within)
        throw new Error("wat");

      const { node } = within;
      if("id" in node && node.id)
        return node.id.name;

      if(s.assert(node, "ObjectMethod")){
        parent = within.getAncestry()[2];
        continue
      }

      if(s.assert(node, "ClassMethod")){
        if(node.key.type !== "Identifier")
          return "ClassMethod";
        if(node.key.name == "render"){
          const owner = within.parentPath.parentPath as t.Path<t.Class>;
          if(owner.node.id)
            return owner.node.id.name;
          else {
            parent = owner.parentPath;
            continue
          }
        }
        else
          return node.key.name;
      }

      parent = within.parentPath;
      continue;
    }

    case "ObjectProperty": {
      const { key } = parent.node as t.ObjectProperty;
      return (
        s.assert(key, "Identifier") ? key.name : 
        s.assert(key, "StringLiteral") ? key.value : 
        "property"
      )
    }

    default:
      return "element";
  }
}
