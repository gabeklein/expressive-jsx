import { ModifyDelegate } from './modifier';
import { ElementInline, Modifier } from 'handle';

export function use(
  this: ModifyDelegate,
  ...args: any[]){

  const { target } = this;
  for(const item of args){
    if(typeof item !== "string")
      continue;

    const mod = target.context.elementMod(item);
    if(!mod)
      continue;

    if(target instanceof ElementInline)
      target.modifiers.push(mod);
    else
    if(target instanceof Modifier){
      target.applicable.push(mod);
    }
  }
}

export function priority(
  this: ModifyDelegate,
  priority: number){

  const { target } = this;
  if(target instanceof Modifier)
    target.priority = priority
}

export function css(this: ModifyDelegate){
  debugger;
}

export function forward(this: ModifyDelegate, ...args: any[]){
  this.forwardFromParentProps(args);
}