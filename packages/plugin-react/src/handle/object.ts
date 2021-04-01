import type { Statement } from '@babel/types';
import type { StackFrame } from 'context';
import type { Define } from 'handle/modifier';
import type { InnerContent, SequenceItem } from 'types';

export abstract class AttributeBody {
  name?: string;
  context!: StackFrame;

  sequence = [] as SequenceItem[];
  statements = [] as Statement[];
  children = [] as InnerContent[];

  constructor(context: StackFrame){
    context.push(this);
  }

  get uid(){
    const value = this.context.unique(this.name!)
    Object.defineProperty(this, "uid", { value });
    return value
  }

  adopt(child: InnerContent){
    const index = this.children.push(child);

    if("context" in child)
      child.context.resolveFor(index);

    this.add(child);
  }

  use(define: Define){
    this.context.elementMod(define);
  }

  add(item: SequenceItem){
    this.sequence.push(item);
  }

  abstract applyModifier(mod: Define): void;

  applyModifiers(name: string){
    let modify = this.context.elementMod(name);
  
    while(modify){
      this.applyModifier(modify);
  
      for(const sub of modify.provides)
        this.context.elementMod(sub);
  
      modify = modify.next;
    }
  }
}