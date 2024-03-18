import { NodePath } from '@babel/traverse';
import { LabeledStatement } from '@babel/types';

import { Context, getContext } from './context/Context';
import { Define } from './context/Define';
import { Component } from './context/Component';
import { handleSwitch, Condition } from './context/Contingent';
import { parseError } from './helper/errors';
import { parseArgument } from './syntax/arguments';

export function handleLabel(path: NodePath<LabeledStatement>){
  const context = createContext(path);
  const body = path.get("body");
  let { name } = path.node.label;

  if(body.isBlockStatement()){
    context.define[name] =
      new Define(name, context, path);

    return;
  }

  if(!body.isExpressionStatement())
    throw parseError(body, "Not an expression", name);

  if(!(context instanceof Define))
    throw parseError(body, "Bad context", name);

  const args = parseArgument(body);

  try {
    context.macro(name, args);
  }
  catch(err: unknown){
    throw parseError(body, err, name);
  }
}

export function createContext(path: NodePath, required?: boolean){
  let parent = path.parentPath!;
  let key = path.key;

  while(
    parent.isBlockStatement() ||
    parent.isReturnStatement() ||
    parent.isExpressionStatement() ||
    parent.isParenthesizedExpression()){

    parent = parent.parentPath!;
    key = parent.key;
  }

  const context = Context.get(parent);

  if(context instanceof Condition)
    return context.for(key);

  if(context)
    return context;

  if(parent.isFunction())
    return new Component(parent);

  if(parent.isIfStatement())
    return handleSwitch(parent);

  if(required === false)
    return getContext(path);

  throw new Error("Context not found");
}