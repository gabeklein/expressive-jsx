import { ExplicitStyle } from './attributes';

import type { StackFrame } from 'context';
import type { Define } from 'handle/modifier';
import type { ComponentIf } from 'handle/switch';
import type { SequenceItem } from 'types';

export abstract class AttributeBody {
  name?: string;
  context: StackFrame
  parent?: AttributeBody | ComponentIf;

  sequence = [] as SequenceItem[];

  get uid(){
    const value = this.context.unique(this.name!)
    Object.defineProperty(this, "uid", { value });
    return value
  }

  constructor(context: StackFrame){
    this.context = context.push(this);
  }

  abstract use(define: Define): void;

  wasAddedTo?<T extends AttributeBody>(element?: T): void;

  add(item: SequenceItem){
    this.sequence.push(item);

    if("wasAddedTo" in item && item.wasAddedTo)
      item.wasAddedTo(this);
  }
}