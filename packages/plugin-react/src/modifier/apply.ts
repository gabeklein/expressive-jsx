import { ParseErrors } from 'errors';
import { DefineElement } from 'handle';
import { parse, ParseContent } from 'parse';

import { ModifyDelegate } from './delegate';

import type { NodePath as Path } from '@babel/traverse';
import type { LabeledStatement } from '@babel/types';
import type { StackFrame } from 'context';
import type { ExplicitStyle } from 'handle/attributes';
import type { BunchOf, ModifyAction, ModifyBodyPath } from 'types';

const Oops = ParseErrors({
  IllegalAtTopLevel: "Cannot apply element styles in top-level of program",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DuplicateModifier: "Duplicate declaration of named modifier!"
})

type ModTuple = [
  string,
  ModifyAction,
  any[] | ModifyBodyPath
];

export function applyModifier(
  initial: string,
  recipient: DefineElement,
  input: ModifyBodyPath){

  const { context } = recipient;
  const styles = {} as BunchOf<ExplicitStyle>;

  let i = 0;
  let stack: ModTuple[] = [
    [ initial, context.getHandler(initial), input ]
  ];

  do {
    const output = new ModifyDelegate(recipient, ...stack[i]);

    Object.assign(styles, output.styles);
    const recycle = output.attrs;
    const pending = [] as ModTuple[];

    if(recycle)
      for(const named in recycle){
        const input = recycle[named];

        if(input){
          const useNext = named === initial;
          const handler = context.getHandler(named, useNext);

          pending.push([named, handler, input]);
        }
      }

    if(pending.length){
      const remaining = stack.slice(i+1);
      stack = [...pending, ...remaining];
      i = 0;
    }
    else i++
  }
  while(i in stack)

  for(const name in styles)
    recipient.add(styles[name]);
}

export function handleTopLevelModifier(
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

  parse(define, ParseContent, body);

  context.elementMod(define);
}