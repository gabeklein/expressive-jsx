import { forwardProp } from './forward';

import type { ModifyDelegate } from 'parse/modifiers';

function applyAlso(
  this: ModifyDelegate,
  ...names: any[]){

  const { target } = this;

  for(const name of names)
    if(typeof name == "string"){
      const mod = target.context.getModifier(name);

      if(mod)
        target.use(mod);
    }
}

function setPriority(
  this: ModifyDelegate,
  priority: number){

  this.target.priority = priority;
}

export const builtIn = {
  forward: forwardProp,
  priority: setPriority,
  use: applyAlso
}

