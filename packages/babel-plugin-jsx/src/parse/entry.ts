import * as $ from 'syntax';

import type { Hub } from '@babel/traverse';
import type * as t from 'syntax/types';

type FunctionPath =
  | t.Path<t.ClassMethod>
  | t.Path<t.ObjectMethod>
  | t.Path<t.FunctionDeclaration>
  | t.Path<t.FunctionExpression>

export function containerName(path: t.Path): string {
  let parent = path.parentPath;
  let encounteredReturn;

  while(true)
  switch(parent.type){
    case "VariableDeclarator": {
      const { id } = parent.node as t.VariableDeclarator;
      return $.is(id, "Identifier")
        ? id.name
        : (<t.VariableDeclaration>parent.parentPath.node).kind
    }

    case "AssignmentExpression":
    case "AssignmentPattern": {
      const { left } = parent.node as t.AssignmentExpression;
      return $.is(left, "Identifier") ? left.name : "assignment"
    }

    case "FunctionDeclaration":
      return (<t.FunctionDeclaration>parent.node).id!.name;

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

      if($.is(node, "ObjectMethod")){
        parent = within.getAncestry()[2];
        continue
      }

      if($.is(node, "ClassMethod")){
        if(node.key.type !== "Identifier")
          return "ClassMethod";
        if(node.key.name == "render"){
          const owner = within.parentPath.parentPath as t.Path<t.Class>;

          if(owner.node.id)
            return owner.node.id.name;

          parent = owner.parentPath;
          continue;
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
        $.is(key, "Identifier") ? key.name : 
        $.is(key, "StringLiteral") ? key.value : 
        "property"
      )
    }

    default:
      return "element";
  }
}

export function getLocalFilename(hub: Hub){
  try {
    const { basename, dirname, sep: separator } = require('path');

    const url = (hub as any).file.opts.filename as string;
    const [ base ] = basename(url).split(".");
  
    if(base !== "index")
      return base;
  
    return dirname(url).split(separator).pop()!;
  }
  catch(err){
    return "File"
  }
}