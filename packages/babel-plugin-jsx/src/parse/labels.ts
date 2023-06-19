import { ParseErrors } from 'errors';
import { Define } from 'handle/definition';
import { ModifyDelegate } from 'parse/modifiers';
import * as $ from 'syntax';
import { doUntilEmpty } from 'utility';

import { parse } from './body';

import type * as t from 'syntax/types';
import type { Style } from 'handle/attributes';
import type { BunchOf, DefineBodyCompat, ModifyAction } from 'types';

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
  const output = {} as BunchOf<Style>;

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

  doUntilEmpty(initial, (next, enqueue) => {
    const { styles, attrs } = new ModifyDelegate(target, ...next);

    Object.assign(output, styles);
    Object.entries(attrs).forEach(([name, value]) => {
      if(!value)
        return;
      
      const handler = context.getHandler(name, name === key);

      enqueue([name, handler, value as any]);
    });
  });

  for(const name in output)
    target.add(output[name]);
}