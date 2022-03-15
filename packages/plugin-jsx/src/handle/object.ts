import type { StackFrame } from 'context';
import type { Define } from 'handle/definition';
import type * as t from 'syntax/types';
import type { InnerContent, SequenceItem } from 'types';
import { hash } from 'utility';

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
      this.context.name = name;
    }
  }

  get uid(){
    let path = "";

    for(let ctx = this.context; ctx; ctx = ctx.parent)
      path += ctx.name

    return this.name + "_" + hash(path);
  }

  add(item: SequenceItem){
    this.sequence.push(item);
  }

  adopt(child: InnerContent){
    const index = this.children.push(child);

    if("context" in child)
      child.context.name = String(index);

    this.add(child);
  }
}