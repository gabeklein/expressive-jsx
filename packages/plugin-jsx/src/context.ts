import { DefineElement } from 'handle/definition';
import { ImportManager, RequireManager } from 'scope';
import { hash, Stack } from 'utility';

import type * as t from 'syntax';
import type { Define , DefineContainer } from 'handle/definition';
import type { FileManager } from 'scope';
import type { BabelState, BunchOf, ModifyAction, Options } from 'types';

interface Stackable {
  context: StackFrame;
}

interface Applicable {
  use(mod: Define): void;
}

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

  constructor(
    path: t.Path<t.BabelProgram>,
    state: BabelState,
    options: Options){

    this.current = state;
    this.prefix = hash(state.filename);
    this.opts = options;

    const { externals, output } = options;

    const FileManager =
      externals == "require" ? RequireManager :
      externals == "import" ? ImportManager :
      output == "js"
        ? RequireManager
        : ImportManager;

    this.program = new FileManager(path, this);
  }

  including(modifiers: BunchOf<any>[]): this {
    let context = this as any;

    for(const imports of modifiers){
      context = Object.create(context)

      for(const name in imports)
        context.handlers.set(name, imports[name]);
    }

    return context;
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
    else {
      const name = mod.name!;

      if(stack.get(name))
        mod.next = stack.get(name);

      stack.set(name, mod);
    }
  }
}
