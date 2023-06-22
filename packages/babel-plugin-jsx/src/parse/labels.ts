import { ParseErrors } from 'errors';
import { Style } from 'handle/attributes';
import { Define } from 'handle/definition';
import * as $ from 'syntax';

import { parse as parseArguments } from './arguments';
import { parse as parseBlock } from './block';

import type * as t from 'syntax/types';

export type DefineBodyCompat =
  | t.Path<t.ExpressionStatement>
  | t.Path<t.BlockStatement>
  | t.Path<t.LabeledStatement>
  | t.Path<t.IfStatement>;

export type ModifyAction =
  (this: ModifyDelegate, ...args: any[]) => Record<string, any> | void;

export const Oops = ParseErrors({
  BadModifierName: "Modifier name cannot start with _ symbol!",
  InlineModeNoVariants: "Cannot attach a CSS variant while styleMode is set to inline.",
  DollarSignDeprecated: "Dollar-sign macros are deprecated. Did you mean to use a namespace?"
});

export function getName(
  path: t.Path<t.LabeledStatement>){

  const { name } = path.get("label").node;

  if(name.startsWith("_"))
    throw Oops.BadModifierName(path);

  if(name.startsWith("$"))
    return name.replace(/^\$/, "--");

  return name;
}

export function handleDefine(
  target: Define,
  path: t.Path<t.LabeledStatement>){

  const { context } = target;

  let key = getName(path);
  let body = path.get('body') as t.Path<t.Statement>;

  if(body.isBlockStatement()){
    const mod = new Define(context, key);

    target.provide(mod);
    parseBlock(mod, body);
    return;
  }

  while($.is(body, "LabeledStatement")){
    key = `${key}.${body.node.label.name}`;
    body = body.get("body") as t.Path<t.Statement>;
  }

  if($.is(body, "IfStatement"))
    key = `${key}.if`;

  handleModifier(key, target, body);
}

function handleModifier(
  key: string,
  target: Define,
  body: t.Path<t.Statement>
){
  const { context } = target;
  const queue = [[key, body]] as [
    key: string,
    body: DefineBodyCompat | any[]
  ][];

  while(queue.length){
    const [key, body] = queue.pop()!;
    const transform = context.getHandler(key);

    let important = false;
    const args = Array.isArray(body) ? body : parseArguments(body.node);

    if(args[args.length - 1] == "!important"){
      important = true;
      args.pop();
    }

    function addStyle(name: string, ...args: any[]){
      const parsed: any[] = args.map(arg => arg.value || (
        arg.requires ? $.requires(arg.requires) : arg
      ))
    
      const output = parsed.length == 1 || typeof parsed[0] == "object"
        ? parsed[0] : Array.from(parsed).join(" ");
  
      target.add(
        new Style(name, output, important)
      )
    }

    if(!transform){
      addStyle(key, ...args);
      return;
    }

    function setContingent(
      select: string | string[],
      priority: number,
      usingBody?: DefineBodyCompat){

      if(!usingBody)
        usingBody = body as DefineBodyCompat;

      const mod = target.variant(select, priority);
  
      parseBlock(mod, usingBody);
  
      return mod;
    }

    const output = transform.apply({
      setContingent,
      target,
      name: key,
      body: body as any
    }, args);

    if(!output)
      return;

    Object
      .entries(output)
      .reverse()
      .forEach(([name, value]) => {
        if(!value)
          return;

        if(!Array.isArray(value))
          value = [value];

        if(important)
          args.push("!important");

        if(name === key)
          addStyle(name, ...value);
        else
          queue.push([name, value]);
      });
  }
}

export interface ModifyDelegate {
  target: Define;
  name: string;
  body: DefineBodyCompat;

  setContingent(
    select: string | string[],
    priority: number,
    usingBody?: DefineBodyCompat
  ): Define;
}