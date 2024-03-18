import { Hub, NodePath, Scope } from '@babel/traverse';
import {
  AssignmentExpression,
  Class,
  Function,
  FunctionDeclaration,
  JSXElement,
  LabeledStatement,
  ObjectProperty,
  VariableDeclaration,
  VariableDeclarator,
} from '@babel/types';

import t from '../types';

export function getName(path: NodePath): string {
  let encounteredReturn;

  while(path)
    switch(path.type){
      case "LabeledStatement":
        return (<LabeledStatement>path.node).label.name;

      case "VariableDeclarator": {
        const { id } = path.node as VariableDeclarator;
        return t.isIdentifier(id)
          ? id.name
          : (<VariableDeclaration>path.parentPath!.node).kind
      }

      case "AssignmentExpression":
      case "AssignmentPattern": {
        const { left } = path.node as AssignmentExpression;
        return t.isIdentifier(left) ? left.name : "assignment";
      }

      case "FunctionDeclaration":
        return (<FunctionDeclaration>path.node).id!.name;

      case "ExportDefaultDeclaration":
        return getLocalFilename(path.hub);

      case "ArrowFunctionExpression": {
        path = path.parentPath!;
        continue;
      }

      case "ReturnStatement": {
        if(encounteredReturn)
          return "return";

        encounteredReturn = path;

        const ancestry = path.getAncestry();
        const within = ancestry.find((x)=> x.isFunction()) as NodePath<Function>;

        const { node } = within;

        if("id" in node && node.id)
          return node.id.name;

        if(t.isObjectMethod(node)){
          path = within.getAncestry()[2];
          continue;
        }

        if(t.isClassMethod(node)){
          if(node.key.type !== "Identifier")
            return "ClassMethod";

          if(node.key.name != "render")
            return node.key.name;

          const owner = within.parentPath.parentPath as NodePath<Class>;

          if(owner.node.id)
            return owner.node.id.name;

          path = owner.parentPath;
          continue;
        }

        path = within.parentPath;
        continue;
      }

      case "ObjectProperty": {
        const { key } = path.node as ObjectProperty;
        return (
          t.isIdentifier(key) ? key.name : 
          t.isStringLiteral(key) ? key.value : 
          "property"
        )
      }

      default:
        return "element";
    }

  return "element";
}

export function getNames(path: NodePath<JSXElement>){
  const names = new Map<string, NodePath>();
  const opening = path.get("openingElement");
  let tag = opening.get("name");

  while(tag.isJSXMemberExpression()){
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

export function uniqueIdentifier(scope: Scope, name = "temp") {
  let uid = name;
  let i = 0;

  do {
    i++;
  } while (
    scope.hasLabel(uid) ||
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid) ||
    scope.hasReference(uid)
  );

  if(i > 1)
    uid = name + i;

  return t.identifier(uid);
}