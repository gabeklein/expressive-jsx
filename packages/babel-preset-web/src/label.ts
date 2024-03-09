import { onExit } from './plugin';
import { CONTEXT, DefineContext, FunctionContext, IfContext, SelectorContext, getContext } from './context';
import { parseArgument } from './syntax/arguments';
import * as t from './types';

export function handleLabel(
  path: t.NodePath<t.LabeledStatement>){

  const context = createContext(path)
  const body = path.get("body");;
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

function parseError(path: t.NodePath, err: unknown, modiferName: string){
  if(!(err instanceof Error))
    return path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${err}`);

  const stack = err.stack!.split("\n    at ");
  const message = err instanceof Error ? err.message : err;
  const error = path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${message}`);

  error.stack = stack.slice(0, stack.findIndex(line => /^parse/.test(line)) + 1).join("\n    at ");
  
  return error;
}

export function createContext(path: t.NodePath, required?: boolean): any {
  let parent = path.parentPath!;
  let key = path.key;

  while(parent.isBlockStatement() || parent.isExpressionStatement()){
    parent = parent.parentPath!;
    key = parent.key;
  }

  const context = CONTEXT.get(parent);

  if(context instanceof IfContext)
    return context.for(key);

  if(context)
    return context;

  if(parent.isFunction()){
    const body = parent.get("body");

    onExit(parent, () => {
      if(!body.isBlockStatement() || body.node.body.length > 0)
        return;
  
      body.replaceWith(t.blockStatement([
        t.returnStatement(
          t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier("this"), [], true),
            undefined, [], true
          )
        )
      ]));
    });

    return new FunctionContext(parent);
  }

  if(parent.isIfStatement()){
    const ambient = createContext(parent) as DefineContext;
    const test = parent.get("test");
    const context = test.isStringLiteral()
      ? new SelectorContext(ambient, parent)
      : new IfContext(ambient, parent);

    onExit(parent, (key, path) => {
      if(key == "conseqent"
      && context instanceof IfContext
      && context.alternate)
        return;
  
      if(!path.removed)
        path.remove();
    });

    return context;
  }

  if(required === false)
    return getContext(path);

  throw new Error("Context not found");
}