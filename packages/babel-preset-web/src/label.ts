import type { NodePath } from '@babel/traverse';
import type { LabeledStatement } from '@babel/types';

import { Context, DefineContext, FunctionContext, getContext } from './context';
import { parseError } from './helper/errors';
import { handleSwitch, IfContext } from './switch';
import { parseArgument } from './syntax/arguments';

export function handleLabel(path: NodePath<LabeledStatement>){
  const context = createContext(path)
  const body = path.get("body");
  let { name } = path.node.label;

  if(body.isBlockStatement()){
    context.add(
      new DefineContext(name, context, path)
    );
    return;
  }

  if(!body.isExpressionStatement())
    throw parseError(body, "Not an expression", name);

  if(!(context instanceof DefineContext))
    throw parseError(body, "Bad context", name);

  const args = parseArgument(body);

  try {
    context.macro(name, args);
  }
  catch(err: unknown){
    throw parseError(body, err, name);
  }
}

export function createContext(path: NodePath, required?: boolean): any {
  let parent = path.parentPath!;
  let key = path.key;

  while(parent.isBlockStatement() || parent.isExpressionStatement()){
    parent = parent.parentPath!;
    key = parent.key;
  }

  const context = Context.get(parent);

  if(context instanceof IfContext)
    return context.for(key);

  if(context)
    return context;

  if(parent.isFunction())
    return new FunctionContext(parent);

  if(parent.isIfStatement())
    return handleSwitch(parent);

  if(required === false)
    return getContext(path);

  throw new Error("Context not found");
}