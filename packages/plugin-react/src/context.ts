import { ElementInline } from 'handle';
import { ImportManager, RequireManager } from 'generate';
import { DEFAULTS, hash, Stack } from 'shared';

import type { NodePath as Path } from '@babel/traverse';
import type { Program } from '@babel/types';
import type { ComponentExpression } from 'handle/entry';
import type { DefineElement, Define } from 'handle/modifier';
import type { ComponentIf } from 'handle/switch';
import type { ExternalsManager } from 'generate/scope';
import type { BabelState, BunchOf, ModifyAction, Options } from 'types';

type Stackable = { context: StackFrame };

export class StackFrame {
  modifiersDeclared = new Set<Define>();
  opts: Options;

  prefix: string;
  styleRoot = {} as any;
  ModifierQuery?: string;
  
  current = {} as any;
  currentComponent?: ComponentExpression;
  currentElement?: ElementInline;
  parentIf?: ComponentIf;
  currentIf?: ComponentIf;

  modifiers = new Stack<DefineElement>();
  handlers = new Stack<ModifyAction>();

  Imports: ExternalsManager;

  get parent(){
    return Object.getPrototypeOf(this);
  }

  constructor(path: Path<Program>, state: BabelState){
    const opts = { ...DEFAULTS, ...state.opts };

    this.current = state;
    this.prefix = hash(state.filename);
    this.opts = opts;

    const Importer =
      opts.useRequire || opts.output == "js"
        ? RequireManager
        : ImportManager;

    this.Imports = new Importer(path, this);
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

  push(node: Stackable): StackFrame {
    const frame: StackFrame = Object.create(this);

    frame.current = node;
    if(node instanceof ElementInline)
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

  elementMod(name: string): DefineElement | undefined;
  elementMod(set: DefineElement): void;
  elementMod(mod: string | DefineElement){
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
