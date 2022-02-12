import { DefineElement } from 'handle/definition';
import { builtIn } from 'modifier/builtIn';
import { FileManager } from 'scope';
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

export class StackFrame {
  modifiersDeclared = new Set<Define>();
  opts: Options;

  prefix: string;
  styleRoot = {} as any;
  ModifierQuery?: string;
  
  current = {} as any;
  currentComponent?: DefineContainer;
  currentElement?: Define;

  modifiers = new Stack<Define>();
  handlers = new Stack<ModifyAction>();

  program: FileManager;

  get parent(){
    return Object.getPrototypeOf(this);
  }

  static create(
    path: t.Path<t.BabelProgram>,
    state: BabelState
  ){
    const options = {
      ...DEFAULTS,
      ...state.opts
    };
    const external =
      Object.assign({}, ...options.modifiers);

    let context = new this(path, state, options);

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

  push(node: Stackable): StackFrame {
    const frame: StackFrame = Object.create(this);

    node.context = frame;
    frame.current = node;

    if(node instanceof DefineElement)
      frame.currentElement = node;

    frame.handlers = frame.handlers.stack();
    frame.modifiers = frame.modifiers.stack();

    return frame;
  }

  unique(name: string){
    return name + "_" + hash(this.prefix);
  }

  resolveFor(append?: string | number){
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

  elementMod(name: string): Define | undefined;
  elementMod(set: Define): void;
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
