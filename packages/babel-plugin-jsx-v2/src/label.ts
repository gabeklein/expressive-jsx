import { CONTEXT, DefineContext, FunctionContext, IfContext, SelectorContext } from './context';
import { parseArgument } from './syntax/arguments';
import * as t from './types';

export function handleLabel(
  path: t.NodePath<t.LabeledStatement>){

  const body = path.get("body");
  const context = createContext(path);
  let { name } = path.node.label;

  if(body.isBlockStatement()){
    new DefineContext(name, context).assignTo(path);
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

function parseError(path: t.NodePath, err: unknown, modiferName: string){
  if(!(err instanceof Error))
    return path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${err}`);

  const stack = err.stack!.split("\n    at ");
  const message = err instanceof Error ? err.message : err;
  const error = path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${message}`);

  error.stack = stack.slice(0, stack.findIndex(line => /^parse/.test(line)) + 1).join("\n    at ");
  
  return error;
}

function createContext(path: t.NodePath): any {
  let parent = path.parentPath!;
  let key = path.key;

  if(parent.isBlockStatement()){
    parent = parent.parentPath!;
    key = parent.key;
  }

  const context = CONTEXT.get(parent);

  if(context instanceof IfContext)
    return context.for(key);

  if(context)
    return context;

  if(parent.isFunction())
    return new FunctionContext(parent);

  if(parent.isIfStatement()){
    const ambient = createContext(parent) as DefineContext;
    const test = parent.get("test");

    if(test.isStringLiteral())
      return new SelectorContext(ambient, parent);

    return new IfContext(ambient, parent);
  }

  throw new Error("Context not found");
}