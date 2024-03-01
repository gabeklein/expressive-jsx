import { createContext, DefineContext } from './context';
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