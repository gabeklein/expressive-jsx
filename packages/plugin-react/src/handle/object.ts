import type { Statement } from '@babel/types';
import type { StackFrame } from 'context';
import type { Define } from 'handle/definition';
import type { InnerContent, SequenceItem } from 'types';

export abstract class AttributeBody {
  name?: string;
  context!: StackFrame;

  sequence = [] as SequenceItem[];
  statements = [] as Statement[];
  children = [] as InnerContent[];

  /** Other definitions applicable to this one. */
  includes = new Set<Define>();

  constructor(context: StackFrame){
    context.push(this);
  }

  abstract apply(mod: Define): void;

  adopt(child: InnerContent){
    const index = this.children.push(child);

    if("context" in child)
      child.context.resolveFor(index);

    this.add(child);
  }

  add(item: SequenceItem){
    this.sequence.push(item);
  }

  applyModifiers(name: string){
    this.context.apply(name, this);
  }
}