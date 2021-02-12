import { ComponentExpression, ComponentIf, ElementInline, ElementModifier, Modifier } from 'handle';
import { ExternalsManager, GenerateReact } from 'regenerate';
import { DEFAULTS, hash, Stack } from 'shared';
import { BabelState, ModifyAction, Options } from 'types';

import { builtIn } from './modifier';

type Stackable = { context: StackFrame };

export interface StackFrame {
  Generator: GenerateReact;
  Imports: ExternalsManager;
}

export class StackFrame {
  modifiersDeclared = new Set<Modifier>();
  opts: Options;

  prefix: string;
  styleRoot = {} as any;
  stateSingleton: BabelState;
  ModifierQuery?: string;
  
  current = {} as any;
  currentComponent?: ComponentExpression;
  currentElement?: ElementInline;
  parentIf?: ComponentIf;
  currentIf?: ComponentIf;

  modifiers = new Stack<ElementModifier>();
  handlers = new Stack<ModifyAction>();

  get parent(){
    return Object.getPrototypeOf(this);
  }

  constructor(pluginPass: BabelState){
    const { filename, opts } = pluginPass;

    this.stateSingleton = pluginPass;
    this.prefix = hash(filename);
    this.current = pluginPass;
    this.opts = { ...DEFAULTS, ...opts };
  }

  static init(pluginPass: BabelState){
    let Stack = new this(pluginPass);

    const external = [ ...Stack.opts.modifiers ];
    const included = Object.assign({}, ...external);
    for(const imports of [ builtIn, included ]){
      const { Helpers, ...Modifiers } = imports as any;

      Stack = Object.create(Stack)

      for(const name in Modifiers)
        Stack.handlers.set(name, Modifiers[name]);
    }

    return pluginPass.context = Stack;
  }

  create(node: Stackable): StackFrame {
    const frame: StackFrame = Object.create(this);

    frame.current = node;
    if(node instanceof ElementInline)
      frame.currentElement = node;

    frame.handlers = frame.handlers.stack();
    frame.modifiers = frame.modifiers.stack();

    return frame;
  }

  push(){
    this.stateSingleton.context = this;
  }

  pop(meta: ElementInline){
    const state = this.stateSingleton;
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
    this.prefix = `${this.prefix} ${append || ""}`;
  }

  getHandler(named: string, ignoreOwn = false){
    let context = this;

    if(ignoreOwn)
      for(let found; !found;){
        found = context.handlers.has(named);
        context = context.parent;
      }

    return this.handlers.get(named);
  }

  elementMod(name: string): ElementModifier;
  elementMod(set: ElementModifier): void;
  elementMod(mod: string | ElementModifier){
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
