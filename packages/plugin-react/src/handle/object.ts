import { ExplicitStyle } from './attributes';

import type { StackFrame } from 'context';
import type { Define } from 'handle/modifier';
import type { ComponentIf } from 'handle/switch';
import type { BunchOf, SequenceItem } from 'types';
import type { Prop } from './attributes';

export abstract class AttributeBody {
  context: StackFrame
  name?: string;
  parent?: AttributeBody | ComponentIf;

  props = {} as BunchOf<Prop>;
  style = {} as BunchOf<ExplicitStyle>;
  sequence = [] as SequenceItem[];

  get uid(){
    const value = this.context.unique(this.name!)
    Object.defineProperty(this, "uid", { value });
    return value
  }

  constructor(context: StackFrame){
    this.context = context.push(this);
  }

  abstract applyModifier(mod: Define): void;

  wasAddedTo?<T extends AttributeBody>(element?: T): void;

  add(item: SequenceItem){
    this.sequence.push(item);

    if("wasAddedTo" in item && item.wasAddedTo)
      item.wasAddedTo(this);
  }

  insert(item: Prop | ExplicitStyle){
    const { name } = item;
    const register = item instanceof ExplicitStyle
      ? this.style : this.props

    if(name){
      const existing = register[name];

      if(existing)
        existing.overridden = true;

      register[name] = item;
    }

    this.add(item);
  }

  addStyle(name: string, value: any){
    this.insert(
      new ExplicitStyle(name, value)
    )
  }
}