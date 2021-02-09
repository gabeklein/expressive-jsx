import { NodePath as Path } from '@babel/traverse';
import { isExpressionStatement, LabeledStatement } from '@babel/types';
import { ParseErrors } from 'errors';
import { ComponentExpression, ComponentIf, ElementInline, ElementModifier, Modifier } from 'handle';
import { ExternalsManager, GenerateReact } from 'regenerate';
import { hash, Shared } from 'shared';
import { BabelState, BunchOf, DoExpressive, ModifyAction } from 'types';

import * as builtIn from './builtin';

type Stackable = { context: StackFrame };

const Oops = ParseErrors({
  IllegalAtTopLevel: "Cannot apply element styles in top-level of program",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DuplicateModifier: "Duplicate declaration of named modifier!"
})

export function handleTopLevelModifier(
  node: LabeledStatement,
  context: StackFrame){

  const { body, label: { name }} = node;

  if(name[0] == "_")
    throw Oops.BadModifierName(node)

  if(context.hasOwnModifier(name))
    throw Oops.DuplicateModifier(node);

  if(isExpressionStatement(body))
    throw Oops.IllegalAtTopLevel(node)

  ElementModifier.insert(context, name, body);
}

export interface StackFrame {
  Generator: GenerateReact;
  Imports: ExternalsManager;
}

export class StackFrame {
  modifiersDeclared = new Set<Modifier>();
  lastInsertedElement?: Path<DoExpressive>;

  prefix: string;
  styleRoot = {} as any;
  stateSingleton: BabelState;
  ModifierQuery?: string;
  
  current = {} as any;
  currentComponent?: ComponentExpression;
  currentElement?: ElementInline;
  parentIf?: ComponentIf;
  currentIf?: ComponentIf;

  get parent(){
    return Object.getPrototypeOf(this);
  }

  constructor(pluginPass: BabelState){
    const { filename } = pluginPass;

    this.stateSingleton = pluginPass;
    this.prefix = hash(filename);
    this.current = pluginPass;
  }

  static init(pluginPass: BabelState){
    const { opts } = Shared;

    let Stack = new this(pluginPass);

    const external = [ ...opts.modifiers ];
    const included = Object.assign({}, ...external);
    for(const imports of [ builtIn, included ]){
      const { Helpers, ...Modifiers } = imports as any;

      Stack = Object.create(Stack)

      for(const name in Modifiers)
        Stack.propertyMod(name, Modifiers[name])
    }

    return pluginPass.context = Stack;
  }

  create(node: Stackable): StackFrame {
    const frame = Object.create(this);
    frame.current = node;
    if(node instanceof ElementInline)
      frame.currentElement = node;
    return frame;
  }

  push(){
    this.stateSingleton.context = this;
  }

  pop(meta: ElementInline){
    const state = this.stateSingleton;
    let { context } = state;
    let newContext: StackFrame | undefined;

    while(true){
      newContext = Object.getPrototypeOf(context);
      if(!newContext)
        break;
      if(context.current === meta)
        break;
      context = newContext;
    }

    if(context.current)
      state.context = newContext!;
    else
      console.error("StackFrame shouldn't bottom out like this");
  }

  resolveFor(append?: string | number){
    this.prefix = `${this.prefix} ${append || ""}`;
  }

  event(this: any, ref: symbol, set: Function){
    if(set)
      this[ref] = set;
    else
      return this[ref]
  }

  dispatch(this: any, ref: symbol, ...args: any[]){
    (<Function>this[ref]).apply(null, args)
  }

  hasOwnPropertyMod(name: string): boolean {
    return this.hasOwnProperty("__" + name)
  }

  hasOwnModifier(name: string): boolean {
    return this.hasOwnProperty("_" + name)
  }

  findPropertyMod(named: string, ignoreOwn = false){
    let context = this;

    if(ignoreOwn){
      let found;
      do {
        found = context.hasOwnPropertyMod(named);
        context = context.parent;
      }
      while(!found);
    }

    return context.propertyMod(named);
  }

  propertyMod(name: string): ModifyAction;
  propertyMod(name: string, set: ModifyAction): void;
  propertyMod(
    this: BunchOf<ModifyAction>,
    name: string,
    set?: ModifyAction){

    const ref = "__" + name;
    if(set)
      this[ref] = set;
    else
      return this[ref]
  }

  elementMod(name: string): ElementModifier;
  elementMod(set: ElementModifier): void;
  elementMod(
    this: BunchOf<ElementModifier>,
    mod: string | ElementModifier){

    if(typeof mod == "string")
      return this["_" + mod];

    const name = "_" + mod.name;
    if(this[name])
      mod.next = this[name];
    this[name] = mod;
  }
}
