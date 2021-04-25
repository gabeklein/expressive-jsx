import { ParseErrors } from 'errors';
import { DefineElement } from 'handle';
import { ModifyDelegate } from 'parse/modifiers';
import { doUntilEmpty } from 'utility';

import { parse } from './body';

import type { NodePath as Path } from '@babel/traverse';
import type { LabeledStatement, Statement } from '@babel/types';
import type { Define } from 'handle';
import type { ExplicitStyle } from 'handle/attributes';
import type { BunchOf, DefineCompatibleBody } from 'types';
import type { StackFrame } from 'context';

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

export function parseDefineBlock(
  target: Define,
  path: Path<LabeledStatement>){

  const body = path.get('body') as Path<Statement>;
  const { name } = path.node.label;

  if(name[0] == "_")
    throw Oops.BadModifierName(path);

  if(body.isExpressionStatement() || LeadingDollarSign.test(name))
    applyDirective(name, target, body as any);

  else if(body.isBlockStatement() || body.isLabeledStatement()){
    const mod = new DefineElement(target.context, name);
    parse(mod, body);
    target.provide(mod);
  }

  else
    throw Oops.BadInputModifier(body, body.type)
}

function applyDirective(
  initial: string,
  recipient: DefineElement,
  input: DefineCompatibleBody){

  const { context } = recipient;
  const handler = context.getHandler(initial);
  const output = {} as BunchOf<ExplicitStyle>;
  const start = [ initial, handler, input ] as const;

  doUntilEmpty(start, (next, enqueue) => {
    const { styles, attrs } =
      new ModifyDelegate(recipient, ...next);

    Object.assign(output, styles);
    Object.entries(attrs).forEach(([name, value]) => {
      if(!value)
        return;
      
      const useNext = name === initial;
      const handler = context.getHandler(name, useNext);

      enqueue([name, handler, value as any]);
    });
  });

  for(const name in output)
    recipient.add(output[name]);
}