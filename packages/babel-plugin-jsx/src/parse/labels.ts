import { Context } from 'context';
import { ParseErrors } from 'errors';
import { Style } from 'handle/attributes';
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

export const Oops = ParseErrors({
  BadModifierName: "Modifier name cannot start with _ symbol!",
  InlineModeNoVariants: "Cannot attach a CSS variant while styleMode is set to inline.",
  DollarSignDeprecated: "Dollar-sign macros are deprecated. Did you mean to use a namespace?"
});

export function getName(
  path: $.Path<$.LabeledStatement>){

  const { name } = path.get("label").node;

  if(name.startsWith("_"))
    throw Oops.BadModifierName(path);

  if(name.startsWith("$"))
    return name.replace(/^\$/, "--");

  return name;
}

type ModifierItem = {
  name: string,
  body?: $.Path<$.Statement>,
  args: any[]
}[];

export function handleDefine(
  target: Define,
  path: $.Path<$.LabeledStatement>){

  const { context } = target;

  let key = getName(path);
  let body = path.get('body') as $.Path<$.Statement>;

  if(body.isBlockStatement()){
    const mod = new Define(context, key);

    target.provide(mod);
    parseBlock(mod, body);
    return;
  }

  while(body.isLabeledStatement()){
    key = `${key}.${body.node.label.name}`;
    body = body.get("body") as $.Path<$.Statement>;
  }

  if(body.isIfStatement())
    key = `${key}.if`;

  let important = false;
  const args = parseArguments(body.node);

  if(args[args.length - 1] == "!important"){
    important = true;
    args.pop();
  }

  const queue: ModifierItem = [{
    name: key,
    args: parseArguments(body.node),
    body
  }];

  while(queue.length){
    const { name, body, args } = queue.pop()!;

    const transform = context.getHandler(name);
    const modifier = new ModifyDelegate(target, name, body);

    const output = transform 
      ? transform.apply(modifier, args)
      : { [name]: args };

    if(!output)
      continue;

    for(const key in output){
      let args = output[key];

      if(args === undefined)
        continue;

      if(!Array.isArray(args))
        args = [args];

      if(important)
        args.push("!important");

      if(key === name)
        modifier.addStyle(key, ...args);
      else
        queue.push({ name: key, args });
    }
  }
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

    this.target.add(
      new Style(name, output)
    )
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