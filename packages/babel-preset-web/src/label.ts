import { NodePath } from '@babel/traverse';
import { Function, IfStatement, LabeledStatement } from '@babel/types';

import { Context } from './context/Context';
import { parseError } from './helper/errors';
import { onExit } from './plugin';
import { parseArgument } from './syntax/arguments';
import { getName } from './syntax/names';
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
    context.macro(name, args);
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
  const name = t.isIdentifier(test) ? test.name : "?";
  const context = getContext(path);
  const define = new Context(path, context, name);

  if(t.isStringLiteral(test)){
    context.children.add(define);
    define.uid = context.uid;
    define.condition = test.value;
  }
  else {
    context.also.add(define);
    define.condition = test;
  }

  onExit(path, (path, key) => {
    if(key == "alternate" || define.alternate)
      return;

    if(!path.removed)
      path.remove();
  });

  return define;
}