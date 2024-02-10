import { Parser } from './arguments';
import { Context, DefineContext } from './context';
import * as t from './types';

type ModifierItem = {
  name: string,
  args: any[],
  body?: t.NodePath<t.Statement>
}[];

export function handleLabel(
  parent: Context,
  path: t.NodePath<t.LabeledStatement>){

  const body = path.get("body");
  let name = path.node.label.name;

  if(name.startsWith("$"))
    name = name.replace(/^\$/, "--");

  if(body.isBlockStatement()){
    const mod = new DefineContext(parent);
    mod.assignTo(path);
    mod.name = name;
    parent.define[name] = mod;
    return;
  }

  if(!body.isExpressionStatement())
    return;

  if(!(parent instanceof DefineContext))
    throw new Error("Invalid modifier");

  const args = new Parser(body.node).arguments;
  const queue: ModifierItem = [{ name, args, body }];

  try {
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
  catch(err: unknown){
    throw parseError(body, err, name);
  }
}

function parseError(path: t.NodePath, err: unknown, modiferName: string){
  if(!(err instanceof Error))
    return path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${err}`);

  const stack = err.stack!.split("\n    at ");
  const error = path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${
    err instanceof Error ? err.message : err
  }`);

  error.stack = stack.slice(0, stack.findIndex(line => /^parse/.test(line)) + 1).join("\n    at ");
  
  return error;
}