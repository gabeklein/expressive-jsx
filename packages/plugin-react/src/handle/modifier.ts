import { AttributeBody, ElementInline, ExplicitStyle } from 'handle';
import { parse, ParseContent } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
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
    name: string,
    body?: Path<any>){

    super(context);

    this.name = name;
    this.forSelector = [ `.${this.uid}` ];
    this.context.resolveFor(name);

    if(body)
      parse(this as any, ParseContent, body);

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
  anchor: DefineElement | ElementInline;
  forSelector: string[];
  ownSelector?: string;

  constructor(
    context: StackFrame,
    parent: Define | ElementInline,
    contingent?: string
  ){
    super(context);

    let select;

    if(parent instanceof ElementInline || parent instanceof DefineComponent)
      select = [ `.${parent.uid}` ];
    else {
      select = [ ...parent.forSelector || [] ];

      if(parent instanceof DefineContingent)
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
    const { anchor } = this;

    define.onlyWithin = this;
    define.priority = 4;

    if(anchor instanceof DefineElement)
      anchor.provides.add(define)
    else
      anchor.context.elementMod(define)
  }

  applyModifier(mod: Define){
    if(this.anchor instanceof ElementInline)
      this.anchor.applyModifier(mod);
  }
}

export class DefineComponent extends DefineElement {
  use(define: DefineElement){
    this.context.elementMod(define);
  }
}