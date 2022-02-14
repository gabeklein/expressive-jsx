import * as s from 'syntax';
import { ParseErrors } from 'errors';
import { DefineElement } from 'handle/definition';
import { ModifyDelegate } from 'parse/modifiers';
import { doUntilEmpty } from 'utility';

import { parse } from './body';

import type * as t from 'syntax/types';
import type { StackFrame } from 'context';
import type { Define } from 'handle/definition';
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

export function handleLabeledStatement(
  path: t.Path<t.LabeledStatement>,
  context: StackFrame){

  const current = context.currentElement;

  if(current)
    handleDefine(current, path);
  else
    handleTopLevelDefine(path, context);
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

  const define = new DefineElement(context, name);

  parse(define, body);

  context.elementMod(define);
}

export function handleDefine(
  target: Define,
  path: t.Path<t.LabeledStatement>){

  let key = getName(path);
  let body = path.get('body') as t.Path<t.Statement>;

  switch(body.type){
    case "BlockStatement":
      handleNestedDefine(target, key, body);
    break;
    
    case "IfStatement":
      handleDirective(`${key}.if`, target, body as any);
    break;

    case "ExpressionStatement":
    case "LabeledStatement": {
      while(s.assert(body, "LabeledStatement")){
        key = `${key}.${body.node.label.name}`;
        body = body.get("body") as t.Path<t.Statement>;
      }
  
      handleDirective(key, target, body as any);
      break;
    }

    default:
      Oops.BadInputModifier(body, body.type)

  }
}

export function handleNestedDefine(
  target: Define,
  name: string,
  body: t.Path<any>){

  const mod = new DefineElement(target.context, name);

  if(/^[A-Z]/.test(name))
    mod.priority = 3;

  target.provide(mod);
  parse(mod, body);
}

type DirectiveTuple = 
  [string, ModifyAction, DefineBodyCompat];

function handleDirective(
  name: string,
  recipient: DefineElement,
  input: DefineBodyCompat){

  const { context } = recipient;
  const handler = context.getHandler(name);
  const output = {} as BunchOf<ExplicitStyle>;
  const initial: DirectiveTuple = [ name, handler, input ];

  doUntilEmpty(initial, (next, enqueue) => {
    const { styles, attrs } =
      new ModifyDelegate(recipient, ...next);

    Object.assign(output, styles);
    Object.entries(attrs).forEach(([key, value]) => {
      if(!value)
        return;
      
      const useNext = key === name;
      const handler = context.getHandler(key, useNext);

      enqueue([key, handler, value as any]);
    });
  });

  for(const name in output)
    recipient.add(output[name]);
}