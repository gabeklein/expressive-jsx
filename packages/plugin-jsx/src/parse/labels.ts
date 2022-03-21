import * as $ from 'syntax';
import { ParseErrors } from 'errors';
import { Define } from 'handle/definition';
import { ModifyDelegate } from 'parse/modifiers';
import { doUntilEmpty } from 'utility';

import { parse } from './body';

import type * as t from 'syntax/types';
import type { ExplicitStyle } from 'handle/attributes';
import type { BunchOf, DefineBodyCompat, ModifyAction } from 'types';

export const Oops = ParseErrors({
  BadInputModifier: "Modifier input of type {1} not supported here!",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DollarSignDeprecated: "$ modifiers are deprecated. Did you mean to use a namespace?"
});

export function getName(
  path: t.Path<t.LabeledStatement>){

  const { name } = path.get("label").node;

  if(name.startsWith("_"))
    throw Oops.BadModifierName(path);

  if(name.startsWith("$"))
    throw Oops.DollarSignDeprecated(path);

  return name;
}

export function handleDefine(
  target: Define,
  path: t.Path<t.LabeledStatement>){

  const key = getName(path);
  const body = path.get('body') as t.Path<t.Statement>;

  switch(body.type){
    case "BlockStatement": {
      const mod = new Define(target.context, key);

      target.provide(mod);
      parse(mod, body);
    }
    break;
    
    case "ExpressionStatement":
    case "LabeledStatement":
    case "IfStatement":
      handleModifier(target, key, body);
    break;

    default:
      Oops.BadInputModifier(body, body.type)
  }
}

export function handleModifier(
  target: Define, key: string, body: t.Path<any>){

  const { context } = target;
  const handler = context.getHandler(key);
  const output = {} as BunchOf<ExplicitStyle>;

  while($.is(body, "LabeledStatement")){
    key = `${key}.${body.node.label.name}`;
    body = body.get("body") as t.Path;
  }

  if($.is(body, "IfStatement"))
    key = `${key}.if`;

  const initial =
    [key, handler, body] as
    [string, ModifyAction, DefineBodyCompat];

  doUntilEmpty(initial, (next, enqueue) => {
    const { styles, attrs } =
      new ModifyDelegate(target, ...next);

    Object.assign(output, styles);
    Object.entries(attrs).forEach(([name, value]) => {
      if(!value)
        return;
      
      const useNext = name === key;
      const handler = context.getHandler(name, useNext);

      enqueue([name, handler, value as any]);
    });
  });

  for(const name in output)
    target.add(output[name]);
}