import { AttributeBody, ElementInline } from 'handle';
import { ParseContent, parser } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
import type { Statement } from '@babel/types';
import type { StackFrame } from 'context';
import type { SelectionProvider } from 'types';

export abstract class Modifier extends AttributeBody {
  parse = parser(ParseContent);

  forSelector?: string[];
  onlyWithin?: ContingentModifier;
  priority?: number;

  alsoApplies = [] as Modifier[];
  
  include(){
    this.context.modifiersDeclared.add(this);
  }
}

export class ElementModifier extends Modifier {
  name?: string;
  next?: ElementModifier;
  hasTargets = 0;

  provides = [] as ElementModifier[];
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

      if(applicable instanceof ContingentModifier){
        this.include();
        continue;
      }
        
      if(applicable instanceof ElementModifier)
        if(applicable.sequence.length)
        names.push(applicable.uid);
    }

    return names;
  }

  applyModifier(mod: ElementModifier){
    mod.priority = this.priority;
    this.provides.push(mod);
    this.onlyWithin = mod.onlyWithin;
  }
}

export class ContingentModifier extends Modifier {
  anchor: ElementModifier | ElementInline;

  constructor(
    context: StackFrame,
    parent: ContingentModifier | ElementModifier | ElementInline,
    contingent?: string | SelectionProvider
  ){
    super(context);

    let select;

    if(parent instanceof ElementInline)
      select = [ `.${parent.uid}` ];
    else {
      select = Object.create(parent.forSelector!);
      if(parent instanceof ContingentModifier)
        parent = parent.anchor;
    }

    if(typeof contingent == "function")
      contingent(select)
    else if(contingent)
      select.push(contingent);

    this.anchor = parent;
    this.forSelector = select;
  }

  applyModifier(mod: ElementModifier){
    const { anchor } = this;

    mod.onlyWithin = this;
    mod.priority = 4;

    if(anchor instanceof ElementModifier)
      anchor.provides.push(mod)
    else
      anchor.context.elementMod(mod)
  }
}