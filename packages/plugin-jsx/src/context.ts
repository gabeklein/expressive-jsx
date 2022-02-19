import { DefineElement } from 'handle/definition';
import { builtIn } from 'modifier/builtIn';
import { containerName, parentFunction } from 'parse/entry';
import { FileManager } from 'scope';
import * as s from 'syntax';
import { hash, Stack } from 'utility';

import type * as t from 'syntax/types';
import type { Define } from 'handle/definition';
import type { BabelState, ModifyAction, Options } from 'types';

interface Stackable {
  context: StackFrame;
}

const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/css",
  pragma: "react",
  output: "js",
  modifiers: []
};

const REGISTER = new WeakMap<t.Node, StackFrame>();
const AMBIENT = new WeakMap<StackFrame, DefineElement>();

export class StackFrame {
  name?: string;
  prefix: string;
  opts: Options;
  program: FileManager;
  
  current = {} as any;
  currentComponent?: t.Path<t.Function>;
  currentElement?: Define;

  modifiersDeclared = new Set<Define>();
  modifiers = new Stack<Define>();
  handlers = new Stack<ModifyAction>();

  get parent(){
    return Object.getPrototypeOf(this);
  }

  get ambient(){
    let ambient = AMBIENT.get(this);

    if(!ambient){
      ambient = new DefineElement(this, this.name!);
      AMBIENT.set(this, ambient);
    }

    return ambient;
  }

  static find(
    path: t.Path<any>,
    create?: boolean
  ): StackFrame {
    while(path = path.parentPath){
      const scope = REGISTER.get(path.node);

      if(scope)
        return scope;
  
      if(s.assert(path, "BlockStatement") && create){
        const inherits = this.find(path);
        const name = containerName(path);
        
        if(!inherits)        
          throw new Error("well that's awkward.");
        
        const next = inherits.push(name);

        next.currentComponent = parentFunction(path);
        
        REGISTER.set(path.node, next);

        return next;
      }
    }

    throw new Error("Scope not found!");
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

    this.current = state;
    this.opts = options;
    this.prefix = hash(state.filename);
    this.program = FileManager.create(this, path, options);
  }

  getApplicable(name: string){
    const apply = [] as Define[];
    let modify: Define | undefined =
      this.getModifier(name);
  
    while(modify){
      apply.push(modify);
  
      for(const sub of modify.provides)
        this.setModifier(sub);
  
      modify = modify.next;
    }

    return apply;
  }

  apply(name: string, target: Define){
    const applied = this.getApplicable(name);

    for(const modifier of applied){
      target.use(modifier);

      for(const sub of modifier.provides)
        this.setModifier(sub);
    }

    return applied;
  }

  push(node?: Stackable | string): StackFrame {
    const frame: StackFrame = Object.create(this);

    if(typeof node == "string"){
      frame.resolveFor(node);
    }
    else if(node){
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

  getModifier(name: string){
    return this.modifiers.get(name);
  }

  setModifier(mod: Define){
    const name = mod.name!;
    const next = this.modifiers.get(name);

    if(next)
      mod.next = next;

    this.modifiers.set(name, mod);
  }
}
