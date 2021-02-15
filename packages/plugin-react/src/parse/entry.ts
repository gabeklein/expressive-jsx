import { isIdentifier } from '@babel/types';
import { ComponentExpression } from 'handle';

import type { NodePath as Path } from '@babel/traverse';
import type {
  ArrowFunctionExpression,
  AssignmentExpression,
  Class,
  Function,
  FunctionDeclaration,
  ObjectProperty,
  VariableDeclaration,
  VariableDeclarator
} from '@babel/types';
import type { StackFrame } from 'context';
import type { DoExpressive } from 'types';

export function generateEntryElement(
  path: Path<DoExpressive>,
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

  return new ComponentExpression(name, context, path, containerFn);
}

function containerName(path: Path): string {
  let parent = path.parentPath;
  let encounteredReturn;

  while(true)
  switch(parent.type){
    case "VariableDeclarator": {
      const { id } = parent.node as VariableDeclarator;
      return isIdentifier(id)
        ? id.name
        : (<VariableDeclaration>parent.parentPath.node).kind
    }

    case "AssignmentExpression":
    case "AssignmentPattern": {
      const { left } = parent.node as AssignmentExpression;
      return isIdentifier(left) ? left.name : "assignment"
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

      const within = ancestry.find((x)=> x.isFunction()) as Path<Function> | undefined;

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
        if(!isIdentifier(node.key))
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
      return isIdentifier(key) ? key.name : "property"
    }

    // mark for deletion
    case "SequenceExpression": {
      const isWithin = path.findParent(
        x => ["ArrowFunctionExpression", "ClassMethod"].includes(x.type)
      );
      const nestedIn = path.findParent(
        x => x.type == "DoExpression"
      )

      if(isWithin && !nestedIn)
        throw isWithin.buildCodeFrameError(
          "Component Syntax `..., do {}` found outside expressive context! Did you forget to arrow-return a do expression?"
        )
      else
        return "callback";
    }

    default:
      return "do";
  }
}
