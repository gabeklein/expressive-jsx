import { Hub, NodePath } from '@babel/traverse';
import {
  AssignmentExpression,
  Class,
  Function,
  FunctionDeclaration,
  IfStatement,
  LabeledStatement,
  ObjectProperty,
  VariableDeclaration,
  VariableDeclarator,
} from '@babel/types';

import { Context } from './context';
import { parseError } from './helper/errors';
import { onExit } from './plugin';
import { parseArgument } from './syntax/arguments';
import t from './types';

export function handleLabel(path: NodePath<LabeledStatement>){
  const context = getContext(path);
  const body = path.get("body");
  let { name } = path.node.label;

  if(body.isBlockStatement()){
    context.define[name] = new Context(path, context, name);
    return;
  }

  if(!body.isExpressionStatement())
    throw parseError(body, "Not an expression", name);

  if(!context)
    throw parseError(body, "Missing context", name);

  const args = parseArgument(body);

  try {
    const queue = [{ name, args }];

    while(queue.length){
      const { name, args } = queue.pop()!;
      const macro = context.macros[name];
      const apply = (args: any) => {
        context.props.set(name, args);
      };

      if(!macro){
        apply(args);
        continue;
      }

      const output = macro.apply(context, args);

      if(!output)
        continue;

      if(Array.isArray(output)){
        apply(output);
        continue;
      }

      if(typeof output != "object")
        throw new Error("Invalid modifier output.");

      for(const key in output){
        let args = output[key];

        if(args === undefined)
          continue;

        if(!Array.isArray(args))
          args = [args];

        if(key === name)
          apply(args);
        else
          queue.push({ name: key, args });
      }
    }
  }
  catch(err: unknown){
    throw parseError(body, err, name);
  }
}

export function getContext(path: NodePath): Context {
  let key = path.key;

  while(path = path.parentPath!){
    const context = Context.get(path);

    if(context instanceof Context){
      if(key === "alternate"){
        let { alternate, parent, path } = context;
    
        if(!alternate){
          alternate = new Context(path, parent, "else");
          context.children.add(alternate);
          context.alternate = alternate;
        }
    
        return alternate;
      }
    
      return context;
    }

    if(path.isFunction())
      return createFunctionContext(path);

    if(path.isIfStatement())
      return createIfContext(path);

    key = path.key;
  }

  throw new Error("Context not found");
}

function createFunctionContext(path: NodePath<Function>){
  const name = getName(path);
  const context = getContext(path);
  const component = new Context(path, context, name);
  const body = path.get("body");

  component.define["this"] = component;

  onExit(path, () => {
    if(body.isBlockStatement() && !body.get("body").length)
      body.pushContainer("body", t.expressionStatement(
        t.jsxElement(
          t.jsxOpeningElement(
            t.jsxIdentifier("this"), [], true
          ), null, [], true
        )
      ));
  });

  return component;
}

function createIfContext(path: NodePath<IfStatement>){
  const test = path.node.test;
  const name = t.isIdentifier(test) ? test.name : "if";
  const outer = getContext(path);
  const inner = new Context(path, outer, name);

  if(t.isStringLiteral(test)){
    outer.children.add(inner);
    inner.uid = outer.uid;
    inner.condition = test.value;
  }
  else {
    outer.also.add(inner);
    inner.condition = test;
  }

  onExit(path, (path, key) => {
    if(key == "alternate" || inner.alternate)
      return;

    if(!path.removed)
      path.remove();
  });

  return inner;
}

function getName(path: NodePath): string {
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

function getLocalFilename(hub: Hub){
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