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

  get uid(){
    let path = "";

    for(let ctx = this.context; ctx; ctx = ctx.parent)
      path += ctx.name

    return this.name + "_" + hash(path);
  }

  constructor(context: StackFrame, name?: string){
    context = Object.create(context);
    context.modifiers = Object.create(context.modifiers);

    if(name)
      context.name = this.name = name;

    this.context = context;
  }

  getModifier(name: string): Define | undefined {
    return this.context.modifiers[name];
  }

  setModifier(name: string, mod: Define){
    const next = this.context.modifiers[name];

    // TODO: this shouldn't happen
    if(next === mod)
      return mod;
    
    if(next)
      mod.then = next;

    this.context.modifiers[name] = mod;

    return mod;
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