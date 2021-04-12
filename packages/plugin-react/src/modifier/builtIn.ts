import { Define } from 'handle';

import type { ModifyDelegate } from './delegate';

import { forward } from "./forward";

function use(
  this: ModifyDelegate,
  ...args: any[]){

  const { target } = this;

  for(const item of args)
    if(typeof item == "string"){
      const mod =
        target.context.elementMod(item);

      if(mod)
        target.applyModifier(mod);
    }
}

function priority(
  this: ModifyDelegate,
  priority: number){

  const { target } = this;

  if(target instanceof Define)
    target.priority = priority
}

function css(this: ModifyDelegate){
  debugger;
}

export const builtIn = {
  forward,
  use,
  priority,
  css
}

