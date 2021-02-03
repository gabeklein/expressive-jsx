import { File, isExpressionStatement, isLabeledStatement, LabeledStatement, Program as BabelProgram } from '@babel/types';
import { ComponentIf, ElementInline, ElementModifier, ComponentExpression } from 'handle';
import { BabelFile, hash, ParseErrors, Shared } from 'shared';
import { BabelState, BunchOf, ModifyAction, Visitor } from 'types';
import { relative } from "path"

import * as builtIn from './builtin';

type Stackable = { context: StackFrame };

let debug = false;

try {
  debug = /inspect-brk/.test(process.execArgv.join());
}
catch(err){}

const Error = ParseErrors({
  IllegalAtTopLevel: "Cannot apply element styles in top-level of program",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DuplicateModifier: "Duplicate declaration of named modifier!"
})

export const Program = <Visitor<BabelProgram>>{
  enter({ node }, state: any){
    if(debug)
      try {
        console.log(" - ", relative(process.cwd(), state.filename))
      }
      catch(err){}

    const stack = new StackFrame(state);
    const context = state.context = stack.create(this);

    Shared.currentFile = state.file as BabelFile;
    node.body = node.body.filter(item => {
      if(isLabeledStatement(item)){
        handleModifier(item);
        return false;
      }
      else
        return true;
    });

    function handleModifier(item: LabeledStatement){
      const { body, label: { name }} = item;

      if(name[0] == "_")
        throw Error.BadModifierName(node)

      if(context.hasOwnModifier(name))
        throw Error.DuplicateModifier(node);

      if(isExpressionStatement(body))
        throw Error.IllegalAtTopLevel(item)

      ElementModifier.insert(context, name, body);
    }
  }
}

export class StackFrame {
  prefix: string;
  program = {} as any;
  styleRoot = {} as any;
  current = {} as any;
  currentComponent?: ComponentExpression;
  currentElement?: ElementInline;
  currentIf?: ComponentIf;
  currentFile?: File;
  entryIf?: ComponentIf;
  stateSingleton: BabelState;
  options: {}
  ModifierQuery?: string;

  get parent(){
    return Object.getPrototypeOf(this);
  }

  constructor(state: BabelState){
    let Stack = this;
    const external = [ ...state.opts.modifiers || [] ];
    const included = Object.assign({}, ...external);

    this.stateSingleton = state;
    this.currentFile = state.file;
    this.prefix = hash(state.filename);
    this.options = {};

    for(const imports of [ builtIn, included ]){
      Stack = Object.create(Stack)

      const { Helpers, ...Modifiers } = imports as any;

      for(const name in Modifiers)
        Stack.propertyMod(name, Modifiers[name])
    }

    return Stack;
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

  pop(
    meta: ElementInline | ElementModifier,
    state: BabelState<StackFrame> = this.stateSingleton){

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
    this.prefix = this.prefix + " " + append || "";
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
