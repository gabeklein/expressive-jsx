import * as t from '@babel/types';
import { DefineContainer } from 'handle';

import { parse } from './body';

import type { NodePath as Path } from '@babel/traverse';
import type {
  ArrowFunctionExpression,
  AssignmentExpression,
  Class,
  DoExpression,
  FunctionDeclaration,
  ObjectProperty,
  VariableDeclaration,
  VariableDeclarator
} from '@babel/types';
import type { StackFrame } from 'context';
import type { FunctionPath } from 'types';

export function generateEntryElement(
  path: Path<DoExpression>,
  context: StackFrame){

  const parent = path.parentPath;
  let containerFn: Path<ArrowFunctionExpression> | undefined;

  switch(parent.type){
    case "ArrowFunctionExpression":
      containerFn = parent as Path<ArrowFunctionExpression>;
    break;

    case "ReturnStatement":
      const container = parent.findParent(x => /.*Function.*/.test(x.type))!;

      if(container.type == "ArrowFunctionExpression")
        containerFn = container as Path<ArrowFunctionExpression>;
    break;
  }

  const name = containerName(containerFn || path as any);
  const define = new DefineContainer(context, name);

  define.context.currentComponent = define;
  define.exec = containerFn;

  parse(define, path.get("body"));

  if(/^[A-Z]/.test(name))
    define.uses(name);

  return define;
}

function containerName(path: Path): string {
  let parent = path.parentPath;
  let encounteredReturn;

  while(true)
  switch(parent.type){
    case "VariableDeclarator": {
      const { id } = parent.node as VariableDeclarator;
      return t.isIdentifier(id)
        ? id.name
        : (<VariableDeclaration>parent.parentPath.node).kind
    }

    case "AssignmentExpression":
    case "AssignmentPattern": {
      const { left } = parent.node as AssignmentExpression;
      return t.isIdentifier(left) ? left.name : "assignment"
    }

    case "FunctionDeclaration":
      return (<FunctionDeclaration>path.node).id!.name;

    case "ExportDefaultDeclaration":
      return "defaultExport";

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

      if(node.type == "ObjectMethod"){
        parent = within.getAncestry()[2];
        continue
      }

      if(node.type == "ClassMethod"){
        if(!t.isIdentifier(node.key))
          return "ClassMethod";
        if(node.key.name == "render"){
          const owner = within.parentPath.parentPath as Path<Class>;
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
      const { key } = parent.node as ObjectProperty;
      return (
        t.isIdentifier(key) ? key.name : 
        t.isStringLiteral(key) ? key.value : 
        "property"
      )
    }

    default:
      return "do";
  }
}
