import { Context } from 'context';
import { ParseErrors } from 'errors';
import { Define, DefineVariant } from 'handle/definition';
import { t } from 'syntax';

import { parse as parseArguments } from './arguments';
import { parse as parseBlock } from './block';

import type * as $ from 'types';

export type DefineBodyCompat = 
  | $.Path<$.ExpressionStatement>
  | $.Path<$.BlockStatement>
  | $.Path<$.LabeledStatement>
  | $.Path<$.IfStatement>;

export type ModifyAction =
  (this: ModifyDelegate, ...args: any[]) => Record<string, any> | void;

type ModifierItem = {
  name: string,
  args: any[],
  body?: $.Path<$.Statement>
}[];

export const Oops = ParseErrors({
  BadModifierName: "Modifier name cannot start with _ symbol!",
  InlineModeNoVariants: "Cannot attach a CSS variant while styleMode is set to inline.",
  DollarSignDeprecated: "Dollar-sign macros are deprecated. Did you mean to use a namespace?"
});

export function handleDefine(
  target: Define, path: $.Path<$.LabeledStatement>){

  const { context } = target;

  let name = getName(path);
  let body = path.get('body') as $.Path<$.Statement>;

  if(body.isBlockStatement()){
    const mod = new Define(context, name);

    target.provide(mod);
    parseBlock(mod, body);
    return;
  }

  while(body.isLabeledStatement()){
    name = `${name}.${body.node.label.name}`;
    body = body.get("body") as $.Path<$.Statement>;
  }

  if(body.isIfStatement())
    name = `${name}.if`;

  const args = parseArguments(body.node);
  const include = context.getHandler("default") || defaultModifier;
  let important = false;

  if(args[args.length - 1] == "!important"){
    important = true;
    args.pop();
  }

  const queue: ModifierItem = [{ name, args, body }];

  while(queue.length){
    const { name, body, args } = queue.pop()!;

    try {
      const modifier = new ModifyDelegate(target, name, body);
      const transform = context.getHandler(name) || include;
      const output = transform.apply(modifier, args);

      if(!output)
        continue;

      if(Array.isArray(output)){
        defaultModifier.apply(modifier, output);
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

        if(important)
          args.push("!important");

        if(key === name)
          defaultModifier.apply(modifier, args);
        else
          queue.push({ name: key, args });
      }
    }
    catch(err: unknown){
      if(!(err instanceof Error))
        throw path.hub.buildError(path.node, `Modifier "${name}" failed: ${err}`);

      const stack = err.stack!.split("\n    at ");

      const error = path.hub.buildError(path.node, `Modifier "${name}" failed: ${
        err instanceof Error ? err.message : err
      }`)

      error.stack = stack.slice(0, stack.findIndex(line => /^parse/.test(line)) + 1).join("\n    at ");
      
      throw error;
    }
  }
}

export function getName(
  path: $.Path<$.LabeledStatement>){

  const { name } = path.get("label").node;

  if(name.startsWith("_"))
    throw Oops.BadModifierName(path);

  if(name.startsWith("$"))
    return name.replace(/^\$/, "--");

  return name;
}

const defaultModifier: ModifyAction = function(){
  this.addStyle(this.name, ...arguments);
}

export class ModifyDelegate {
  public context: Context;

  constructor(
    public readonly target: Define,
    public readonly name: string,
    public readonly body?: $.Path<$.Statement>
  ){
    this.context = target.context;
  }

  addStyle(name: string, ...args: any[]){
    const parsed = args.map<any>(arg => arg.value || (
      arg.requires ? t.requires(arg.requires) : arg
    ))
  
    const output = parsed.length == 1 || typeof parsed[0] == "object"
      ? parsed[0] : Array.from(parsed).join(" ");

    this.target.addStyle(name, output);
  }

  setContingent(
    select: string | string[],
    priority: number,
    usingBody?: DefineBodyCompat){

    if(!usingBody)
      usingBody = this.body as DefineBodyCompat;

    const mod = new DefineVariant(this.target, select, priority || 1);

    parseBlock(mod, usingBody);

    return mod;
  }
}