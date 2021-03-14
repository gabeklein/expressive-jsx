import { AttributeBody, ElementInline } from 'handle';
import { ParseContent, parser } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
import type { Statement } from '@babel/types';
import type { StackFrame } from 'context';

export abstract class Define extends AttributeBody {
  parse = parser(ParseContent);

  forSelector?: string[];
  onlyWithin?: DefineContingent;
  priority?: number;

  alsoApplies = [] as Define[];
  
  setActive(){
    this.context.modifiersDeclared.add(this);
  }
}

export class DefineElement extends Define {
  next?: DefineElement;
  includes = new Set<DefineElement>();
  targets = new Set<ElementInline>();

  priority = 1;

  constructor(
    context: StackFrame,
    name: string,
    body: Path<Statement>){

    super(context);
    this.name = name;
    this.context.resolveFor(name);
    this.forSelector = [ `.${this.uid}` ];
    this.parse(body);

    // if(/^[A-Z]/.test(name))
    //   this.priority = 3;
  }

  get classList(){
    const names: string[] = []
 
    for(const applicable of [this, ...this.alsoApplies]){
      if(applicable.sequence.length)
        applicable.setActive();

      if(applicable instanceof DefineContingent){
        this.setActive();
        continue;
      }
        
      if(applicable instanceof DefineElement)
        if(applicable.sequence.length)
          names.push(applicable.uid);
    }

    return names;
  }

  use(define: DefineElement){
    define.priority = this.priority;
    this.includes.add(define);
    this.onlyWithin = define.onlyWithin;
  }
}

export class DefineContingent extends Define {
  anchor: DefineElement | ElementInline;
  forSelector: string[];
  ownSelector?: string;

  constructor(
    context: StackFrame,
    parent: DefineElement | DefineContingent | ElementInline,
    contingent?: string
  ){
    super(context);

    let select;

    if(parent instanceof ElementInline)
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
    this.setActive();

    const include = this.alsoApplies.map(x => x.uid);

    if(this.sequence.length)
      include.unshift(this.ownSelector!);

    return include.join(" ");
  }

  use(define: DefineElement){
    const { anchor } = this;

    define.onlyWithin = this;
    define.priority = 4;

    if(anchor instanceof DefineElement)
      anchor.includes.add(define)
    else
      anchor.context.elementMod(define)
  }
}