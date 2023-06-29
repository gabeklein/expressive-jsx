import { Context } from './context';

export class Define {
  name?: string;

  within?: Define;
  container?: Define;

  styles = {} as Record<string, string>;
  props = {} as Record<string, string>;
  
  priority = 1;

  /** Modifiers based upon this one. */
  dependant = new Set<Define>();

  uid: string;

  context: Context;

  get isUsed(){
    return Object.keys(this.styles).length > 0;
  }

  get selector(){
    return [ `.${this.uid}` ];
  }

  constructor(
    context: Context,
    name = context.name){

    context.file.declared.add(this);

    this.name = name;
    this.context = context;
    this.uid = name + "_" + context.path();
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

    this.uid = parent.uid;
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

  provide(define: Define){
    this.dependant.add(define);
    this.parent.provide(define);

    define.within = this;
    define.priority = this.priority;
  }
}