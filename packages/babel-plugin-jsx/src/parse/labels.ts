import { ParseErrors } from 'errors';
import { Define } from 'handle/definition';
import { ModifyDelegate } from 'parse/modifiers';
import * as $ from 'syntax';
import { doUntilEmpty } from 'utility';

import { parse as parseArguments } from './arguments';
import { parse } from './body';

import type * as t from 'syntax/types';
import type { BunchOf, DefineBodyCompat, ModifyAction } from 'types';
import { Style } from 'handle/attributes';

export const Oops = ParseErrors({
  BadModifierName: "Modifier name cannot start with _ symbol!",
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

  let key = getName(path);
  let body = path.get('body') as t.Path<t.Statement>;

  if(body.isBlockStatement()){
    const mod = new Define(target.context, key);

    target.provide(mod);
    parse(mod, body);
    return;
  }

  const { context } = target;

  while($.is(body, "LabeledStatement")){
    key = `${key}.${body.node.label.name}`;
    body = body.get("body") as t.Path<t.Statement>;
  }

  if($.is(body, "IfStatement"))
    key = `${key}.if`;
  
  const handler = context.getHandler(key);

  const initial =
    [key, handler, body] as
    [string, ModifyAction, DefineBodyCompat];

  doUntilEmpty(initial, ([name, transform, input], enqueue) => {
    const attrs = {} as BunchOf<any[]>;

    let important = false;
    const args = parseArguments(input.node);

    if(args[args.length - 1] == "!important"){
      important = true;
      args.pop();
    }

    if(!transform){
      const parsed: any[] = args.map(arg => (
        arg.value || arg.requires ? $.requires(arg.requires) : arg
      ))
    
      const output = parsed.length == 1 || typeof parsed[0] == "object"
        ? parsed[0] : Array.from(parsed).join(" ");
  
      target.add(
        new Style(name, output, important)
      )

      return;
    }

    const mod = new ModifyDelegate(target, name, input);
    const output = transform.apply(mod, args);

    if(!output)
      return;

    const { style } = output;

    for(const name in attrs){
      let args: any[] = attrs[name];

      if(!Array.isArray(args))
        args = [args];

      if(important)
        args.push("!important");
        
      attrs[name] = args;
    }

    if(style)
      for(const name in style)
        target.add(
          new Style(name, style[name], important)
        ) 

    Object.entries(attrs).forEach(([name, value]) => {
      if(!value)
        return;
      
      const handler = context.getHandler(name, name === key);

      enqueue([name, handler, value as any]);
    });
  });
}