import { generateElement } from 'generate';
import { recombineProps } from 'generate/es5';
import { ElementInline, ExplicitStyle } from 'handle';
import { AttributeBody } from 'handle/object';

import type { StackFrame } from 'context';

export abstract class Define extends AttributeBody {
  next?: Define;
  forSelector?: string[];
  onlyWithin?: DefineContingent;
  
  priority = 1;

  /** Modifiers available to children of applicable elements. */
  provides = new Set<Define>();

  /** Targets which this modifier applies to. */
  targets = new Set<ElementInline>();

  toExpression(maybeProps?: boolean){
    const { context } = this;
    const element = new ElementInline(context);

    element.name = this.name;
    element.applyModifier(this);

    const info = generateElement(element);

    if(maybeProps && info.children.length === 0)
      return recombineProps(info.props);

    return context.Imports.container(info);
  }

  get collapsable(){
    return this.targets.size <= 1 && !this.onlyWithin;
  }

  containsStyles(staticOnly?: boolean){
    return !!this.sequence.find(style => {
      if(style instanceof ExplicitStyle)
        if(!staticOnly || style.invariant)
          return true;
    })
  }
  
  setActive(){
    this.context.modifiersDeclared.add(this);
  }

  addStyle(name: string, value: any){
    this.add(
      new ExplicitStyle(name, value)
    )
  }

  applyModifier(mod: Define){
    this.includes.add(mod);
  }
}

export class DefineElement extends Define {
  constructor(
    context: StackFrame,
    name: string){

    super(context);

    this.name = name;
    this.forSelector = [ `.${this.uid}` ];
    this.context.resolveFor(name);

    // if(/^[A-Z]/.test(name))
    //   this.priority = 3;
  }

  use(define: DefineElement){
    define.priority = this.priority;
    this.provides.add(define);
    this.onlyWithin = define.onlyWithin;
  }
}

export class DefineContingent extends Define {
  anchor: DefineElement;
  forSelector: string[];
  ownSelector?: string;

  constructor(
    context: StackFrame,
    parent: DefineComponent | DefineContingent,
    contingent?: string
  ){
    super(context);

    let select;

    if(parent instanceof DefineComponent)
      select = [ `.${parent.uid}` ];
    else {
      select = [ ...parent.forSelector || [] ];
      parent = parent.anchor;
    }

    if(contingent)
      select.push(`.${contingent}`);

    this.anchor = parent;
    this.ownSelector = contingent;
    this.forSelector = select;
  }

  toClassName(){
    const { includes, ownSelector } = this;

    const include = [ ...includes ].map(x => x.uid);

    if(this.containsStyles(true))
      include.unshift(ownSelector!);

    if(include.length){
      this.setActive();
      return include.join(" ");
    }
  }

  use(define: DefineElement){
    define.onlyWithin = this;
    define.priority = 4;

    this.anchor.provides.add(define);
  }
}

export class DefineComponent extends DefineElement {
  use(define: DefineElement){
    this.context.elementMod(define);
  }
}