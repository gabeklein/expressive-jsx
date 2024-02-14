import { Parser } from './syntax/arguments';
import { CONTEXT, DefineContext, FunctionContext } from './context';
import * as t from './types';

type ModifierItem = {
  name: string,
  args: any[],
  body?: t.NodePath<t.Statement>
}[];

export function handleLabel(
  path: t.NodePath<t.LabeledStatement>){

  let parent = path.parentPath;

  if(parent.isBlockStatement())
    parent = parent.parentPath!;

  let context = CONTEXT.get(parent);

  if(!context){
    if(parent.isFunction())
      context = new FunctionContext(parent);
    else
      throw new Error("Context not found");
  }

  const body = path.get("body");

  if(body.isBlockStatement()){
    new DefineContext(context, path);
    return;
  }

  if(!body.isExpressionStatement())
    return;

  if(!(context instanceof DefineContext))
    throw new Error("Invalid modifier");

  let { name } = path.node.label;

  try {
    applyMacros(context, name, body);
  }
  catch(err: unknown){
    throw parseError(body, err, name);
  }
}

function applyMacros(
  parent: DefineContext,
  name: string,
  body: t.NodePath<t.ExpressionStatement>){

  const args = new Parser(body.node).arguments;
  const queue: ModifierItem = [{ name, args, body }];

  while(queue.length){
    const { name, args } = queue.pop()!;
    const apply = (args: any[]) => {
      parent.assign(name, ...args);
    }

    if(!(parent instanceof DefineContext))
      throw new Error("Invalid modifier");

    const macro = parent.macros[name];

    if(!macro){
      apply(args);
      continue;
    }

    const output = macro.apply(parent as DefineContext, args);

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

function parseError(path: t.NodePath, err: unknown, modiferName: string){
  if(!(err instanceof Error))
    return path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${err}`);

  const stack = err.stack!.split("\n    at ");
  const message = err instanceof Error ? err.message : err;
  const error = path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${message}`);

  error.stack = stack.slice(0, stack.findIndex(line => /^parse/.test(line)) + 1).join("\n    at ");
  
  return error;
}