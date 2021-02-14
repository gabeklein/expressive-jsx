import { isExpressionStatement, LabeledStatement } from '@babel/types';
import { ParseErrors } from 'errors';
import { ElementInline, ElementModifier, ExplicitStyle, Modifier } from 'handle';
import { StackFrame } from 'context';
import { BunchOf, ModiferBody, ModifyAction } from 'types';

import { ModifyDelegate } from './delegate';

const Oops = ParseErrors({
  IllegalAtTopLevel: "Cannot apply element styles in top-level of program",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DuplicateModifier: "Duplicate declaration of named modifier!"
})

type ModTuple = [string, ModifyAction, any[] | ModiferBody ];

export function applyModifier(
  initial: string,
  recipient: Modifier | ElementInline,
  input: ModiferBody){

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
        let input = recycle[named];

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
  node: LabeledStatement,
  context: StackFrame){

  const { body, label: { name }} = node;

  if(name[0] == "_")
    throw Oops.BadModifierName(node)

  if(context.modifiers.has(name))
    throw Oops.DuplicateModifier(node);

  if(isExpressionStatement(body))
    throw Oops.IllegalAtTopLevel(node)

  context.elementMod(
    new ElementModifier(context, name, body)
  );
}