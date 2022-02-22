import * as s from 'syntax';
import { ParseErrors } from 'errors';
import { Define } from 'handle/definition';
import { ModifyDelegate } from 'parse/modifiers';
import { doUntilEmpty } from 'utility';

import { parse } from './body';

import type * as t from 'syntax/types';
import type { StackFrame } from 'context';
import type { ExplicitStyle } from 'handle/attributes';
import type { BunchOf, DefineBodyCompat, ModifyAction } from 'types';

export const Oops = ParseErrors({
  BadInputModifier: "Modifier input of type {1} not supported here!",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DollarSignDeprecated: "$ modifiers are deprecated. Did you mean to use a namespace?",
  DuplicateModifier: "Duplicate declaration of named modifier!",
  IllegalAtTopLevel: "Cannot apply element styles in top-level of program"
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

export function handleTopLevelDefine(
  node: t.Path<t.LabeledStatement>,
  context: StackFrame){

  const name = getName(node);
  const body = node.get("body");

  if(context.modifiers.has(name))
    throw Oops.DuplicateModifier(node);

  if(s.assert(body, "ExpressionStatement"))
    throw Oops.IllegalAtTopLevel(node)

  const define = new Define(context, name);

  parse(define, body);

  context.setModifier(define);
}

export function handleDefine(
  target: Define,
  path: t.Path<t.LabeledStatement>){

  const key = getName(path);
  const body = path.get('body') as t.Path<t.Statement>;

  switch(body.type){
    case "BlockStatement":
      handleNestedDefine(target, key, body);
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

function handleNestedDefine(
  target: Define,
  name: string,
  body: t.Path<any>){

  const mod = new Define(target.context, name);

  if(/^[A-Z]/.test(name))
    mod.priority = 3;

  target.provide(mod);
  parse(mod, body);
}

export function handleModifier(
  target: Define,
  key: string,
  body: t.Path<any>){

  const { context } = target;
  const handler = context.getHandler(key);
  const output = {} as BunchOf<ExplicitStyle>;

  while(s.assert(body, "LabeledStatement")){
    key = `${key}.${body.node.label.name}`;
    body = body.get("body") as t.Path;
  }

  if(s.assert(body, "IfStatement"))
    key = `${key}.if`;

  const initial =
    [ key, handler, body ] as
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