import { Generator } from 'generate/element';
import { recombineProps } from 'generate/es5';
import { doUntilEmpty } from 'utility';

import { ExplicitStyle } from './attributes';
import { AttributeBody } from './object';

import type { StackFrame } from 'context';
import type { ElementInline } from 'handle/element';
import type { DefineConsequent } from 'handle/switch';

export type DefineAny = DefineElement | DefineConsequent;

export class Define extends AttributeBody {
  next?: Define;
  onlyWithin?: Define;
  
  priority = 1;

  /** Modifiers available to children of applicable elements. */
  provides = new Set<Define>();

  /** Modifiers based upon this one. */
  dependant = new Set<Define>();

  /** Targets which this modifier applies to. */
  targets = new Set<Define | ElementInline>();

  get selector(){
    return [ `.${this.uid}` ];
  }

  get isUsed(): boolean | void {
    if(this.context.modifiersDeclared.has(this))
      return true;

    if(this.targets.size)
      return true;

    for(const child of this.dependant)
      if(child.isUsed || child instanceof DefineVariant)
        return true;
  }

  get isDeclared(){
    return doUntilEmpty<Define, boolean>(this,
      (x, add) => {
        if(x.containsStyle(true))
          return true;

        add(...x.dependant);
      }
    )
  }

  provide(define: DefineElement){
    this.provides.add(define);
  }

  toExpression(maybeProps?: boolean){
    const info = new Generator(this).info;

    if(maybeProps && info.children.length === 0)
      return recombineProps(info.props);

    return this.context.program.container(info);
  }

  containsStyle(staticOnly?: boolean): ExplicitStyle | undefined;
  containsStyle(named: string): ExplicitStyle | undefined;
  containsStyle(arg?: boolean | string){
    return this.sequence.find(style => {
      if(style instanceof ExplicitStyle){
        if(typeof arg == "string")
          return arg == style.name;
        else
          return !arg || style.invariant;
      }
    });
  }
  
  setActive(withPriority?: number){
    if(!this.containsStyle(true))
      return;

    if(withPriority! > this.priority)
      this.priority = withPriority!;

    this.context.modifiersDeclared.add(this);
  }

  addStyle(name: string, value: any){
    this.add(
      new ExplicitStyle(name, value)
    )
  }

  use(mod: Define){
    this.includes.add(mod);

    if(mod instanceof DefineVariant)
      this.dependant.add(mod);
  }
}

export class DefineLocal extends Define {
  constructor(
    private parent: ElementInline,
    styles: Set<ExplicitStyle>
  ){
    super(parent.context);
    this.sequence = Array.from(styles);
    this.priority = 2;
  }

  get uid(){
    return this.parent.uid;
  }
}

export class DefineElement extends Define {
  constructor(context: StackFrame, name: string){
    super(context, name);

    this.context.currentElement = this;
  }
}

export class DefineContainer extends DefineElement {
  provide(define: DefineElement){
    this.context.elementMod(define);
  }
}

export class DefineVariant extends Define {
  constructor(
    private parent: DefineElement,
    private suffix: string[],
    public priority: number){

    super(parent.context);
  }

  get selector(){
    return this.suffix.map(select => (
      `${this.parent.selector}${select}`
    ))
  }

  get uid(){
    return this.parent.uid;
  }

  get isUsed(){
    return false;
  }

  provide(define: DefineElement){
    define.onlyWithin = this;
    define.priority = this.priority;

    this.parent.provide(define);
    this.dependant.add(define);
  }
}