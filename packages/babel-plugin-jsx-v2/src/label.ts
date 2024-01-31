import { NodePath } from '@babel/traverse';

import { t } from './';
import { Parser } from './arguments';
import { requires } from './construct';
import { Context, DefineContext } from './context';

type ModifierItem = {
  name: string,
  args: any[],
  body?: NodePath<t.Statement>
}[];

export function handleLabel(
  parent: Context,
  name: string,
  body: NodePath){

  if(body.isBlockStatement()){
    const mod = new DefineContext(parent);
    mod.assignTo(body);
    mod.define[name] = mod;
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
      const apply = (...args: any[]) => {
        const parsed = args.map<any>(arg => arg.value || (
          arg.requires ? requires(arg.requires) : arg
        ));
      
        const output = parsed.length == 1 || typeof parsed[0] == "object"
          ? parsed[0] : Array.from(parsed).join(" ");

        parent.styles[name] = output;
      }

      const macro = parent.macros[name] || apply;
      const output = macro(...args);

      if(!output)
        continue;

      if(Array.isArray(output)){
        apply(...output);
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

function parseError(path: NodePath, err: unknown, modiferName: string){
  if(!(err instanceof Error))
    return path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${err}`);

  const stack = err.stack!.split("\n    at ");
  const error = path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${
    err instanceof Error ? err.message : err
  }`);

  error.stack = stack.slice(0, stack.findIndex(line => /^parse/.test(line)) + 1).join("\n    at ");
  
  return error;
}