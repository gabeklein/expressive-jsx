import type { StackFrame } from 'context';
import type { Define } from 'handle/definition';
import type * as t from 'syntax/types';
import type { InnerContent, SequenceItem } from 'types';

export abstract class AttributeBody {
  name?: string;
  tagName?: string | t.JSXMemberExpression;
  context!: StackFrame;

  sequence = [] as SequenceItem[];
  statements = [] as t.Statement[];
  children = [] as InnerContent[];

  /** Other definitions applicable to this one. */
  includes = new Set<Define>();

  constructor(context: StackFrame, name?: string){
    context.push(this);

    if(name){
      this.name = name;
      this.context.resolveFor(name);
    }
  }

  get uid(){
    return this.context.unique(this.name!);
  }

  add(item: SequenceItem){
    this.sequence.push(item);
  }

  adopt(child: InnerContent){
    const index = this.children.push(child);

    if("context" in child)
      child.context.resolveFor(index);

    this.add(child);
  }
}