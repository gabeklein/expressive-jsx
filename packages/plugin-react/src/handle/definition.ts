import { generateElement } from 'generate';
import { recombineProps } from 'generate/es5';
import { ElementInline, ExplicitStyle } from 'handle';
import { AttributeBody } from 'handle/object';

import type { NodePath as Path } from '@babel/traverse';
import type { ArrowFunctionExpression } from '@babel/types';
import type { StackFrame } from 'context';
import type { DefineConsequent } from 'handle/switch';

export type DefineAny = DefineElement | DefineConsequent;

export abstract class Define extends AttributeBody {
  next?: Define;
  selector!: string[];
  onlyWithin?: DefineConsequent;
  
  priority = 1;

  /** Modifiers available to children of applicable elements. */
  provides = new Set<Define>();

  /** Modifiers based upon this one. */
  variants = new Set<DefineVariant>();

  /** Targets which this modifier applies to. */
  targets = new Set<ElementInline>();

  abstract use(define: DefineElement): void;

  toExpression(maybeProps?: boolean){
    const element = new ElementInline(this.context);

    element.name = this.name;
    element.applyModifier(this);

    const info = generateElement(element);

    if(maybeProps && info.children.length === 0)
      return recombineProps(info.props);

    return this.context.Scope.container(info);
  }

  get uid(){
    return this.context.unique(this.name!);
  }

  get collapsable(){
    return (
      this.targets.size <= 1 &&
      this.variants.size < 1 &&
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

  applyModifier(mod: Define){
    this.includes.add(mod);

    if(mod instanceof DefineVariant)
      this.variants.add(mod);
  }
}

export class DefineElement extends Define {
  constructor(
    context: StackFrame,
    name: string){

    super(context);

    this.name = name;
    this.context.resolveFor(name);
    this.selector = [ `.${this.uid}` ];

    // if(/^[A-Z]/.test(name))
    //   this.priority = 3;
  }

  use(define: DefineElement){
    define.priority = this.priority;
    this.provides.add(define);
    this.onlyWithin = define.onlyWithin;
  }
}

export class DefineContainer extends DefineElement {
  exec?: Path<ArrowFunctionExpression>;
  
  toExpression(){
    return super.toExpression(!this.exec);
  }
  
  use(define: DefineElement){
    this.context.elementMod(define);
  }
}

export class DefineVariant extends Define {
  constructor(
    private parent: DefineElement,
    suffix: string,
    priority: number){

    super(parent.context);

    this.selector = [`.${parent.uid}${suffix}`];
    this.priority = priority;
  }

  get uid(){
    return this.parent.uid;
  }

  get collapsable(){
    return false;
  }

  use(){
    void 0;
  }
}