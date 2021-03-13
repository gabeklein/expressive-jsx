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
  
  include(){
    this.context.modifiersDeclared.add(this);
  }
}

export class DefineElement extends Define {
  name?: string;
  next?: DefineElement;
  hasTargets = 0;

  provides = [] as DefineElement[];
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
  }

  get classList(){
    const names: string[] = []
 
    for(const applicable of [this, ...this.alsoApplies]){
      if(applicable.sequence.length)
        applicable.include();

      if(applicable instanceof DefineContingent){
        this.include();
        continue;
      }
        
      if(applicable instanceof DefineElement)
        if(applicable.sequence.length)
        names.push(applicable.uid);
    }

    return names;
  }

  applyModifier(mod: DefineElement){
    mod.priority = this.priority;
    this.provides.push(mod);
    this.onlyWithin = mod.onlyWithin;
  }
}

export class DefineContingent extends Define {
  anchor: DefineElement | ElementInline;

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
      select = Object.create(parent.forSelector!);
      if(parent instanceof DefineContingent)
        parent = parent.anchor;
    }

    if(contingent)
      select.push(contingent);

    this.anchor = parent;
    this.forSelector = select;
  }

  applyModifier(mod: DefineElement){
    const { anchor } = this;

    mod.onlyWithin = this;
    mod.priority = 4;

    if(anchor instanceof DefineElement)
      anchor.provides.push(mod)
    else
      anchor.context.elementMod(mod)
  }
}