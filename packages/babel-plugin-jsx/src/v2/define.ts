import { NodePath } from '@babel/traverse';
import { JSXElement, LabeledStatement } from '@babel/types';

import { Context } from './context';

export class Define {
  within?: Define;
  container?: Define;

  styles = {} as Record<string, string>;
  props = {} as Record<string, string>;
  
  priority = 1;
  isUsed = false;

  /** Modifiers based upon this one. */
  dependant = new Set<Define>();

  get uid(){
    return this.name + "_" + this.context.path();
  }

  get selector(){
    return [ `.${this.uid}` ];
  }

  constructor(
    public context: Context,
    public name?: string){
  }

  apply(element: NodePath<JSXElement>){
    
  }

  add(key: string, body: NodePath<LabeledStatement>){
    
  }

  variant(select: string | string[], priority: number){
    return new DefineVariant(this, select, priority || 1);
  }

  provide(define: Define){
    define.container = this;
  }
}

export class DefineVariant extends Define {
  constructor(
    private parent: Define,
    private suffix: string | string[],
    public priority: number){

    super(parent.context);
    this.within = parent.within;
    parent.dependant.add(this);
  }

  get selector(){
    let { suffix } = this;

    if(typeof suffix == "string")
      suffix = [ suffix ];

    return suffix.map(select => (
      this.parent.selector + select
    ))
  }

  get uid(){
    return this.parent.uid;
  }

  provide(define: Define){
    this.dependant.add(define);
    this.parent.provide(define);

    define.within = this;
    define.priority = this.priority;
  }
}