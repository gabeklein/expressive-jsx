import { ParseErrors } from 'errors';
import { DefineElement } from 'handle/definition';
import { ModifyDelegate } from 'parse/modifiers';
import { doUntilEmpty } from 'utility';

import { parse } from './body';

import type { StackFrame } from 'context';
import type { Define } from 'handle/definition';
import type { ExplicitStyle } from 'handle/attributes';
import type { LabeledStatement, Path, Statement } from 'syntax';
import type { BunchOf, DefineBodyCompat, ModifyAction } from 'types';

const Oops = ParseErrors({
  BadInputModifier: "Modifier input of type {1} not supported here!",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DuplicateModifier: "Duplicate declaration of named modifier!",
  IllegalAtTopLevel: "Cannot apply element styles in top-level of program"
});

const LeadingDollarSign = /^\$[a-z]\w*/;

export function handleTopLevelDefine(
  node: Path<LabeledStatement>,
  context: StackFrame){

  const { name } = node.get("label").node;
  const body = node.get("body");

  if(name[0] == "_")
    throw Oops.BadModifierName(node)

  if(context.modifiers.has(name))
    throw Oops.DuplicateModifier(node);

  if(body.isExpressionStatement())
    throw Oops.IllegalAtTopLevel(node)

  const define = new DefineElement(context, name);

  parse(define, body);

  context.elementMod(define);
}

export function handleDefine(
  target: Define,
  path: Path<LabeledStatement>){

  const body = path.get('body') as Path<Statement>;
  const { name } = path.node.label;

  if(name[0] == "_")
    throw Oops.BadModifierName(path);

  if(body.isExpressionStatement() || LeadingDollarSign.test(name))
    handleDirective(name, target, body as any);

  else if(body.isBlockStatement() || body.isLabeledStatement())
    handleNestedDefine(target, name, body);

  else
    throw Oops.BadInputModifier(body, body.type)
}

function handleNestedDefine(
  target: Define,
  name: string,
  body: Path<any>){

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