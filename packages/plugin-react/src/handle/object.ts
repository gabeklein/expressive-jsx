import type { StackFrame } from 'context';
import type { Define } from 'handle/modifier';
import type { ComponentIf } from 'handle/switch';
import type { SequenceItem } from 'types';

export abstract class AttributeBody {
  name?: string;
  context!: StackFrame;
  parent?: AttributeBody | ComponentIf;

  sequence = [] as SequenceItem[];

  constructor(context: StackFrame){
    context.push(this);
  }

  get uid(){
    const value = this.context.unique(this.name!)
    Object.defineProperty(this, "uid", { value });
    return value
  }

  abstract use(define: Define): void;

  add(item: SequenceItem){
    this.sequence.push(item);
  }
}