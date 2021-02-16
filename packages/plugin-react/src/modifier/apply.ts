import { ParseErrors } from 'errors';
import { ElementModifier } from 'handle';

import { ModifyDelegate } from './delegate';

import type { NodePath as Path } from '@babel/traverse';
import type { LabeledStatement } from '@babel/types';
import type { ExplicitStyle } from 'handle/attributes';
import type { ElementInline } from 'handle/element';
import type { Modifier } from 'handle/modifier';
import type { StackFrame } from 'context';
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
  recipient: Modifier | ElementInline,
  input: ModifyBodyPath){

  const handler = recipient.context.getHandler(initial);
  
  const styles = {} as BunchOf<ExplicitStyle>;
  // const props = {} as BunchOf<Attribute>;

  let i = 0;
  let stack: ModTuple[] = [[ initial, handler, input ]];

  do {
    const next = stack[i];
    const output = new ModifyDelegate(recipient, ...next);

    Object.assign(styles, output.styles);
    // Object.assign(props, output.props);

    const recycle = output.attrs;
    const pending = [] as ModTuple[];

    if(recycle)
      for(const named in recycle){
        const input = recycle[named];

        if(input == null)
          continue;

        const useNext = named === initial;
        const handler = recipient.context.getHandler(named, useNext);

        pending.push([named, handler, input]);
      }

    if(pending.length){
      stack = [...pending, ...stack.slice(i+1)];
      i = 0;
    }
    else i++
  }
  while(i in stack)

  for(const name in styles)
    recipient.insert(styles[name]);
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

  context.elementMod(
    new ElementModifier(context, name, body)
  );
}