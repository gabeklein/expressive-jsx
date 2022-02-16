import { DefineElement } from 'handle/definition';
import { builtIn } from 'modifier/builtIn';
import { containerName } from 'parse/entry';
import { FileManager } from 'scope';
import * as s from 'syntax';
import { hash, Stack } from 'utility';

import type * as t from 'syntax/types';
import type { Define , DefineContainer } from 'handle/definition';
import type { BabelState, ModifyAction, Options } from 'types';

interface Stackable {
  context: StackFrame;
}

interface Applicable {
  use(mod: Define): void;
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
  currentComponent?: DefineContainer;
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

  apply(name: string, target: Applicable){
    let modify = this.elementMod(name);
    const didApply = [] as Define[];
  
    while(modify){
      didApply.push(modify);
      target.use(modify);
  
      for(const sub of modify.provides)
        this.elementMod(sub);
  
      modify = modify.next;
    }

    return didApply;
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

  elementMod(set: Define): void;
  elementMod(name: string): Define | undefined;
  elementMod(mod: string | Define){
    const stack = this.modifiers;

    if(typeof mod == "string")
      return stack.get(mod);

    const name = mod.name!;

    if(stack.get(name))
    mod.next = stack.get(name);

    stack.set(name, mod);
  }
}
