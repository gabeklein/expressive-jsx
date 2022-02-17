import type { StackFrame } from 'context';
import type { Define } from 'handle/definition';
import type * as t from 'syntax/types';
import type { InnerContent, SequenceItem } from 'types';

export abstract class AttributeBody {
  name?: string;
  context!: StackFrame;

  sequence = [] as SequenceItem[];
  statements = [] as t.Statement[];
  children = [] as InnerContent[];

  /** Other definitions applicable to this one. */
  includes = new Set<Define>();

  constructor(context: StackFrame){
    context.push(this);
  }

  abstract use(mod: Define): void;

  get uid(){
    return this.context.unique(this.name!);
  }

  adopt(child: InnerContent){
    const index = this.children.push(child);

    if("context" in child)
      child.context.resolveFor(index);

    this.add(child);
  }

  add(item: SequenceItem){
    this.sequence.push(item);
  }
}