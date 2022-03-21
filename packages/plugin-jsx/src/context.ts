import { Define } from 'handle/definition';
import { builtIn } from 'modifier/builtIn';
import { containerName, parentFunction } from 'parse/entry';
import { FileManager } from 'scope';
import * as $ from 'syntax';
import { hash } from 'utility';

import type * as t from 'syntax/types';
import type { BabelState, BunchOf, ModifyAction, Options } from 'types';
import type { AttributeBody } from 'handle/object';
import type { Element } from "parse/jsx";

const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/css",
  pragma: "react",
  output: "js",
  modifiers: []
};

const REGISTER = new WeakMap<t.Node, StackFrame>();
const AMBIENT = new WeakMap<StackFrame, Define>();

export function getContext(
  path: t.Path<any>, create?: boolean): StackFrame {

  while(path = path.parentPath){
    const scope = REGISTER.get(path.node);

    if(scope)
      return scope;

    if(!$.is(path, "BlockStatement") || !create)
      continue;

    const parentContext = getContext(path);

    if(!parentContext)
      throw new Error("well that's awkward.");

    const name = containerName(path);
    const define = new Define(parentContext, name);
    const { context } = define;

    REGISTER.set(path.node, context);
  
    context.name = containerName(path);
  
    const fn = parentFunction(path);
  
    if(fn)
      context.currentComponent = fn;
  
    return context;
  }

  throw new Error("Scope not found!");
}

export class StackFrame {
  name: string;
  opts: Options;
  program: FileManager;
  
  current!: AttributeBody;
  currentComponent?: t.Path<t.Function>;
  currentElement?: Define;

  modifiersDeclared = new Set<Define>();
  modifiers = {} as BunchOf<Define>;
  handlers = {} as BunchOf<ModifyAction>;

  get parent(){
    return Object.getPrototypeOf(this);
  }

  get ambient(){
    let ambient = AMBIENT.get(this);

    if(ambient)
      return ambient;

    return new Define(this, this.name);
  }

  set ambient(item: Define){
    AMBIENT.set(this, item);
  }

  constructor(
    path: t.Path<t.BabelProgram>,
    state: BabelState){

    const options = { ...DEFAULTS, ...state.opts };
    const imports = Object.assign({}, builtIn, ...options.modifiers);

    this.opts = options;
    this.name = hash(state.filename);
    this.program = FileManager.create(this, path, options);
  
    REGISTER.set(path.node, this);

    for(const name in imports)
      this.handlers[name] = imports[name];
  }

  getHandler(named: string, ignoreOwn = false){
    let context = this as any;

    if(ignoreOwn)
      for(let found; !found;){
        found = context.handlers.has(named);
        context = context.parent;
      }

    const [key, ...path] = named.split(".");
    let handler = this.handlers[key];

    for(const key of path)
      handler = (handler as any)[key];

    return handler;
  }

  getModifier(name: string): Define | undefined {
    return this.modifiers[name];
  }

  setModifier(name: string, mod: Define){
    const next = this.modifiers[name];

    // TODO: this shouldn't happen
    if(next === mod)
      return mod;
    
    if(next)
      mod.then = next;

    this.modifiers[name] = mod;

    return mod;
  }
}

export function applyModifier(
  target: Element, from: string | Define){

  const apply = [] as Define[];
  let modify = typeof from == "string"
    ? target.context.getModifier(from)
    : from;

  while(modify){
    apply.push(modify);

    for(const use of [modify, ...modify.includes]){
      target.includes.add(use);
      use.targets.add(target);
    }

    const context = modify.context.modifiers;

    Object.getOwnPropertyNames(context).map(name => {
      target.context.setModifier(name, context[name]);
    })

    if(modify !== modify.then)
      modify = modify.then;
    else
      break;
  }

  return apply;
}