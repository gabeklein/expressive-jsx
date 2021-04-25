import { ParseErrors } from 'errors';
import { DefineElement } from 'handle';
import { parse } from 'parse';
import { doUntilEmpty } from 'shared';

import { ModifyDelegate } from './delegate';

import type { NodePath as Path } from '@babel/traverse';
import type { LabeledStatement } from '@babel/types';
import type { StackFrame } from 'context';
import type { ExplicitStyle } from 'handle/attributes';
import type { BunchOf, ModifyBodyPath } from 'types';

const Oops = ParseErrors({
  IllegalAtTopLevel: "Cannot apply element styles in top-level of program",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DuplicateModifier: "Duplicate declaration of named modifier!"
});

export function applyDirective(
  initial: string,
  recipient: DefineElement,
  input: ModifyBodyPath){

  const { context } = recipient;
  const styles = {} as BunchOf<ExplicitStyle>;
  const start = [
    initial,
    context.getHandler(initial),
    input
  ] as const;

  doUntilEmpty(start, (next, enqueue) => {
    const { styles: contribute, attrs } =
      new ModifyDelegate(recipient, ...next);

    Object.assign(styles, contribute);
    Object.entries(attrs).forEach(([name, value]) => {
      if(!value)
        return;
      
      const useNext = name === initial;
      const handler = context.getHandler(name, useNext);

      enqueue([name, handler, value as any]);
    });
  });

  for(const name in styles)
    recipient.add(styles[name]);
}

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