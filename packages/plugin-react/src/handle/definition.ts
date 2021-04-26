import { generateElement } from 'generate/element';
import { recombineProps } from 'generate/es5';

import { ExplicitStyle } from './attributes';
import { ElementInline } from './element';
import { AttributeBody } from './object';

import type { StackFrame } from 'context';
import type { DefineConsequent } from 'handle/switch';
import type { ArrowFunctionExpression, Path } from 'syntax';

export type DefineAny = DefineElement | DefineConsequent;

export abstract class Define extends AttributeBody {
  next?: Define;
  onlyWithin?: DefineConsequent;
  
  priority = 1;

  /** Modifiers available to children of applicable elements. */
  provides = new Set<Define>();

  /** Modifiers based upon this one. */
  dependant = new Set<DefineVariant | DefineConsequent>();

  /** Targets which this modifier applies to. */
  targets = new Set<ElementInline>();

  abstract provide(define: DefineElement): void;

  abstract get selector(): string[];

  toExpression(maybeProps?: boolean){
    const element = new ElementInline(this.context);

    element.name = this.name;
    element.use(this);

    const info = generateElement(element);

    if(maybeProps && info.children.length === 0)
      return recombineProps(info.props);

    return this.context.program.container(info);
  }

  get uid(){
    return this.context.unique(this.name!);
  }

  get collapsable(){
    return (
      this.targets.size <= 1 &&
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
    if(withPriority! > this.priority)
      this.priority = withPriority!;

    this.context.modifiersDeclared.add(this);

    return this.uid;
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

export class DefineElement extends Define {
  constructor(
    context: StackFrame,
    name: string){

    super(context);

    this.name = name;
    this.context.resolveFor(name);

    // if(/^[A-Z]/.test(name))
    //   this.priority = 3;
  }

  get selector(){
    return [ `.${this.uid}` ];
  }

  provide(define: DefineElement){
    define.priority = this.priority;
    this.provides.add(define);
    this.onlyWithin = define.onlyWithin;
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

  provide(){
    void 0;
  }
}