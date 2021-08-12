import { DefineContainer } from 'handle/definition';
import * as t from 'syntax';

import { parse } from './body';

import type {
  ArrowFunctionExpression,
  AssignmentExpression,
  Class,
  ClassMethod,
  DoExpression,
  FunctionDeclaration,
  FunctionExpression,
  ObjectMethod,
  ObjectProperty,
  Path,
  VariableDeclaration,
  VariableDeclarator
} from 'syntax';
import type { StackFrame } from 'context';

type FunctionPath =
  | Path<ClassMethod>
  | Path<ObjectMethod>
  | Path<FunctionDeclaration>
  | Path<FunctionExpression>

export function generateEntryElement(
  path: Path<DoExpression>,
  context: StackFrame){

  const exec = parentFunction(path);
  const name = containerName(exec || path as any);
  const define = new DefineContainer(context, name);

  define.context.currentComponent = define;
  define.exec = exec;

  if(/^[A-Z]/.test(name))
    define.uses(name);

  parse(define, path.get("body"));

  return define;
}

function parentFunction(path: Path<DoExpression>){
  const parent = path.parentPath;
  let containerFn: Path<ArrowFunctionExpression> | undefined;

  if(parent.isArrowFunctionExpression())
    containerFn = parent;
  else
  if(parent.isReturnStatement()){
    const container = parent.findParent(x => /.*Function.*/.test(x.type))!;

    if(container.type == "ArrowFunctionExpression")
      containerFn = container as Path<ArrowFunctionExpression>;
  }

  return containerFn;
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
      return "element";
  }
}