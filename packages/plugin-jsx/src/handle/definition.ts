import { generateElement } from 'generate/element';
import { recombineProps } from 'generate/es5';

import { ExplicitStyle } from './attributes';
import { AttributeBody } from './object';

import type { StackFrame } from 'context';
import type { ElementInline } from 'handle/element';
import type { DefineConsequent } from 'handle/switch';
import type { ArrowFunctionExpression, Path } from 'syntax';

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

  provide(define: DefineElement){
    this.provides.add(define);
  }

  toExpression(maybeProps?: boolean){
    const info = generateElement(this);

    if(maybeProps && info.children.length === 0)
      return recombineProps(info.props);

    return this.context.program.container(info);
  }

  get isUsed(){
    if(this.context.modifiersDeclared.has(this))
      return true;

    if(this.targets.size)
      return true;

    for(const child of this.dependant)
      if(child.isUsed)
        return true;
  }

  get selector(){
    return [ `.${this.uid}` ];
  }

  get collapsable(){
    return (
      this.targets.size == 1 &&
      this.dependant.size < 1 &&
      !this.onlyWithin
    );
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
  constructor(
    context: StackFrame,
    name: string){

    super(context);

    this.name = name;
    this.context.resolveFor(name);
  }
}

export class DefineContainer extends DefineElement {
  exec?: Path<ArrowFunctionExpression>;
  
  provide(define: DefineElement){
    this.context.elementMod(define);
  }
}

export class DefineVariant extends Define {
  constructor(
    private parent: DefineElement,
    private suffix: string,
    public priority: number){

    super(parent.context);
  }

  get selector(){
    return [`.${this.parent.uid}${this.suffix}`];
  }

  get uid(){
    return this.parent.uid;
  }

  get collapsable(){
    return false;
  }

  provide(define: DefineElement){
    define.onlyWithin = this;
    define.priority = this.priority;

    this.parent.provide(define);
    this.dependant.add(define);
  }
}