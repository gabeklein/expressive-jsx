import { ImportManager, RequireManager } from 'generate';
import { DefineElement } from 'handle/definition';
import { DEFAULTS, hash, Stack } from 'shared';

import type { NodePath as Path } from '@babel/traverse';
import type { Program } from '@babel/types';
import type { Define , DefineContainer} from 'handle/definition';
import type { FileManager } from 'generate/scope';
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

  Scope: FileManager;

  get parent(){
    return Object.getPrototypeOf(this);
  }

  constructor(path: Path<Program>, state: BabelState){
    const opts = { ...DEFAULTS, ...state.opts };

    this.current = state;
    this.prefix = hash(state.filename);
    this.opts = opts;

    const FileManager =
      opts.useRequire || opts.output == "js"
        ? RequireManager
        : ImportManager;

    this.Scope = new FileManager(path, this);
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

  apply(name: string, to: Applicable){
    let modify = this.elementMod(name);
  
    while(modify){
      to.use(modify);
  
      for(const sub of modify.provides)
        this.elementMod(sub);
  
      modify = modify.next;
    }
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

    return this.handlers.get(named);
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
