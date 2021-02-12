import { NodePath as Path } from '@babel/traverse';
import { Statement } from '@babel/types';
import { ParseErrors } from 'errors';
import { AttributeBody, ElementInline, ExplicitStyle } from 'handle';
import { StackFrame } from 'context';
import { ensureArray } from 'shared';
import { BunchOf, SelectionProvider } from 'types';

const Oops = ParseErrors({
  NodeUnknown: "Unhandled node of type {1}",
})

function concat(
  to: BunchOf<any[]>, 
  from: BunchOf<any[]>,
  ...names: string[]){

  for(const name of names)
    if(name in from)
      to[name] = name in to
        ? from[name].concat(to[name])
        : from[name]
}

export abstract class Modifier extends AttributeBody {
  forSelector?: string[];
  onlyWithin?: ContingentModifier;
  onGlobalStatus?: string[];
  priority?: number;

  alsoApplies = [] as Modifier[];

  parse(body: Path<Statement>){
    const content = body.isBlockStatement() ? ensureArray(body.get("body")) : [body];
    for(const item of content){
      if(item.type in this)
        (this as any)[item.type](item.node, item);
      else throw Oops.NodeUnknown(item as any, item.type)
    }
  }

  addStyle(name: string, value: any){
    this.insert(
      new ExplicitStyle(name, value)
    )
  }
}

export class ElementModifier extends Modifier {
  name?: string;
  next?: ElementModifier;
  hasTargets = 0;
  provides = [] as ElementModifier[];
  priority = 1;

  static insert(
    context: StackFrame,
    name: string,
    body: Statement
  ){
    const mod = new this(context, name, body);
    context.elementMod(mod);
  }

  constructor(
    context: StackFrame,
    name: string,
    body: Statement){

    super(context);
    this.name = name;
    this.context.resolveFor(name);
    this.forSelector = [ `.${this.uid}` ];
    this.parseNodes(body);
  }

  ElementModifier(mod: ElementModifier){
    mod.priority = this.priority;
    this.provides.push(mod);
    this.onlyWithin = mod.onlyWithin;
    concat(mod as any, this as any, "onGlobalStatus");
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

  ElementModifier(mod: ElementModifier){
    const { anchor } = this;

    mod.onlyWithin = this;
    mod.priority = 4;

    if(anchor instanceof ElementModifier)
      anchor.provides.push(mod)
    else
      anchor.context.elementMod(mod)
  }

  didFinishParsing(){

  }
}