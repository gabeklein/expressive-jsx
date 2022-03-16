import { Define } from 'handle/definition';
import { builtIn } from 'modifier/builtIn';
import { containerName, parentFunction } from 'parse/entry';
import { FileManager } from 'scope';
import * as $ from 'syntax';
import { hash, Stack } from 'utility';

import type * as t from 'syntax/types';
import type { BabelState, ModifyAction, Options } from 'types';
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

    return newContext(path);
  }

  throw new Error("Scope not found!");
}

export function newContext(path: t.Path<any>){
  const parentContext = getContext(path);

  if(!parentContext)
    throw new Error("well that's awkward.");
  
  const context = parentContext.push();
  
  REGISTER.set(path.node, context);

  context.name = containerName(path);

  const fn = parentFunction(path);

  if(fn)
    context.currentComponent = fn;

  return context;
}

export class StackFrame {
  name: string;
  opts: Options;
  program: FileManager;
  
  current!: AttributeBody;
  currentComponent?: t.Path<t.Function>;
  currentElement?: Define;

  modifiersDeclared = new Set<Define>();
  modifiers = new Stack<Define>();
  handlers = new Stack<ModifyAction>();

  get parent(){
    return Object.getPrototypeOf(this);
  }

  get ambient(){
    return AMBIENT.get(this) || this.init(this.name);
  }

  set ambient(item: Define){
    AMBIENT.set(this, item);
  }

  init(name?: string){
    const ambient = new Define(this, name);

    AMBIENT.set(this, ambient);
    return ambient;
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
      this.handlers.set(name, imports[name]);
  }

  push(node?: AttributeBody): StackFrame {
    const frame: StackFrame = Object.create(this);

    if(node){
      node.context = frame;
      frame.current = node;
    }

    frame.handlers = frame.handlers.push();
    frame.modifiers = frame.modifiers.push();

    return frame;
  }

  getHandler(named: string, ignoreOwn = false){
    let context = this as any;

    if(ignoreOwn)
      for(let found; !found;){
        found = context.handlers.has(named);
        context = context.parent;
      }

    const [key, ...path] = named.split(".");
    let handler = this.handlers.get(key);

    for(const key of path)
      handler = (handler as any)[key];

    return handler;
  }

  getModifier(name: string): Define | undefined {
    if(name == "this")
      return this.parent.ambient;

    return this.modifiers.get(name);
  }

  setModifier(name: string, mod?: Define){
    const next = this.modifiers.get(name);

    if(!mod)
      mod = new Define(this, name);

    if(next)
      mod.next = next;

    this.modifiers.set(name, mod);

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

    for(const sub of modify.provides)
      target.context.setModifier(sub.name!, sub);

    modify = modify.next;
  }

  return apply;
}