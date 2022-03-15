import { Define } from 'handle/definition';
import { builtIn } from 'modifier/builtIn';
import { containerName, parentFunction } from 'parse/entry';
import { FileManager } from 'scope';
import * as $ from 'syntax';
import { hash, Stack } from 'utility';

import type * as t from 'syntax/types';
import type { BabelState, ModifyAction, Options } from 'types';
import type { AttributeBody } from 'handle/object';

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
    const context = parentContext.push();

    context.resolveFor(name);

    const fn = parentFunction(path);

    if(fn)
      context.currentComponent = fn;
    
    REGISTER.set(path.node, context);

    return context;
  }

  throw new Error("Scope not found!");
}

export class StackFrame {
  name?: string;
  prefix: string;
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

  init(name?: string){
    const ambient = new Define(this, name);

    AMBIENT.set(this, ambient);
    return ambient;
  }

  static create(
    path: t.Path<t.BabelProgram>,
    state: BabelState){

    const options = { ...DEFAULTS, ...state.opts };
    const external = Object.assign({}, ...options.modifiers);

    let context = state.context = new this(path, state, options);
  
    REGISTER.set(path.node, context);

    for(const imports of [builtIn, external]){
      context = Object.create(context);

      for(const name in imports)
        context.handlers.set(name, imports[name]);
    }

    return context;
  }

  constructor(
    path: t.Path<t.BabelProgram>,
    state: BabelState,
    options: Options){

    this.opts = options;
    this.prefix = hash(state.filename);
    this.program = FileManager.create(this, path, options);
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

  unique(name: string){
    return name + "_" + hash(this.prefix);
  }

  resolveFor(append?: string | number){
    this.name = String(append);
    this.prefix = `${this.prefix} ${append || ""}`;
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
