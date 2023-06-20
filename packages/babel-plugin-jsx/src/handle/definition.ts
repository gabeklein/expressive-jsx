import { Generator } from 'generate/element';
import { recombineProps } from 'generate/es5';
import { doUntilEmpty } from 'utility';

import { Style } from './attributes';
import { AttributeBody } from './object';

import type { InnerContent } from 'types';
import type * as t from 'syntax/types';
import type { Context } from 'context';

export class ElementInline extends AttributeBody {
  selfClosing?: boolean;
  parent?: ElementInline;

  adopt(child: InnerContent): void {
    if(child instanceof ElementInline)
      child.parent = this;

    super.adopt(child);
  }
  
  toExpression(){
    return new Generator(this).element(this.selfClosing);
  }
}

export class Define extends AttributeBody {
  constructor(context: Context, name?: string){
    super(context, name);

    this.context.ambient = this;

    if(name && /^[A-Z]/.test(name))
      this.priority = 2;
  }

  then?: Define;
  container?: Define;

  within?: Define;
  
  priority = 1;

  /** Targets which this modifier applies to. */
  targets = new Set<Define | ElementInline>();

  /** Modifiers based upon this one. */
  dependant = new Set<Define>();

  get selector(){
    return [ `.${this.uid}` ];
  }

  get isUsed(): boolean | void {
    if(this.context.declared.has(this))
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

  use(mod: Define){
    this.includes.add(mod);

    if(mod instanceof DefineVariant)
      this.dependant.add(mod);
  }

  provide(define: Define){
    define.container = this;
    this.setModifier(define.name!, define);
  }

  toExpression(maybeProps?: boolean): t.Expression {
    const { info } = new Generator(this);

    if(maybeProps && info.children.length === 0)
      return recombineProps(info.props);

    return this.context.program.container(info);
  }

  addStyle(name: string, value: any){
    this.add(new Style(name, value));
  }
  
  setActive(withPriority?: number){
    if(!this.containsStyle(true))
      return;

    if(withPriority! > this.priority)
      this.priority = withPriority!;

    this.context.declared.add(this);
  }

  containsStyle(staticOnly?: boolean): Style | undefined;
  containsStyle(named: string): Style | undefined;
  containsStyle(arg?: boolean | string){
    return this.sequence.find(style => {
      if(style instanceof Style)
        return typeof arg == "string"
          ? arg == style.name
          : !arg || style.invariant;
    });
  }

  variant(select: string | string[], priority: number){
    return new DefineVariant(this, select, priority || 1);
  }
}

export class DefineLocal extends Define {
  constructor(
    private parent: ElementInline,
    styles: Set<Style>
  ){
    super(parent.context);
    this.sequence = Array.from(styles);
    this.priority = 2;
  }

  get uid(){
    return this.parent.uid;
  }
}

export class DefineVariant extends Define {
  constructor(
    private parent: Define,
    private suffix: string | string[],
    public priority: number){

    super(parent.context);
    this.within = parent.within;
    parent.use(this);
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

  get isUsed(){
    return false;
  }

  provide(define: Define){
    this.dependant.add(define);
    this.parent.provide(define);

    define.within = this;
    define.priority = this.priority;
  }
}