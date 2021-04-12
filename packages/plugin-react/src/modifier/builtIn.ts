import { Define } from 'handle';

import { forward } from './forward';

import type { ModifyDelegate } from './delegate';

function use(
  this: ModifyDelegate,
  ...args: any[]){

  const { target } = this;

  for(const item of args)
    if(typeof item == "string"){
      const mod =
        target.context.elementMod(item);

      if(mod)
        target.use(mod);
    }
}

function priority(
  this: ModifyDelegate,
  priority: number){

  const { target } = this;

  if(target instanceof Define)
    target.priority = priority;
}

export const builtIn = {
  forward,
  priority,
  use
}

