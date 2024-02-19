import { CONTEXT, DefineContext, FunctionContext, IfContext } from './context';
import { parseArgument } from './syntax/arguments';
import * as t from './types';

export function handleLabel(
  path: t.NodePath<t.LabeledStatement>){

  const body = path.get("body");
  const context = createContext(path);

  if(body.isBlockStatement()){
    new DefineContext(context, path);
    return;
  }

  if(!body.isExpressionStatement() || !(context instanceof DefineContext))
    throw new Error("Invalid modifier");

  let { name } = path.node.label;
  const args = parseArgument(body);

  try {
    context.macro(name, args);
  }
  catch(err: unknown){
    throw parseError(body, err, name);
  }
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
    return key === "consequent" ? context : context.alt(path);

  if(context)
    return context;

  if(parent.isFunction())
    return new FunctionContext(parent);

  if(parent.isIfStatement())
    return new IfContext(createContext(parent), parent);

  throw new Error("Context not found");
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