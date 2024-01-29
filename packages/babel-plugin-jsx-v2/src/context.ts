import { Macro } from '.';

export const CONTEXT = new WeakMap<NodePath, Context>();

import type { NodePath } from '@babel/traverse';

export class Context {
  define: Record<string, DefineContext> = {};
  macros: Record<string, Macro> = {};

  constructor(context?: Context){
    if(!context)
      return;

    this.define = Object.create(context.define);
    this.macros = Object.create(context.macros);
  }

  assignTo(path: NodePath){
    CONTEXT.set(path, this);
  }

  static get(path: NodePath | null | undefined, required: boolean): Context | undefined;
  static get(path: NodePath | null | undefined, required?: true): Context;
  static get(path: NodePath | null | undefined, required?: boolean) {
    while (path) {
      const context = CONTEXT.get(path);

      if (context)
        return context;

      path = path.parentPath;
    }

    if (required !== false)
      throw new Error("Context not found");
  }
}

export class ProgramContext extends Context {
  constructor(path: NodePath){
    super();
    this.assignTo(path);
  }
}

export class DefineContext extends Context {
  styles: Record<string, string> = {};
}

export class FunctionContext extends DefineContext {
  constructor(path: NodePath){
    super(Context.get(path, true));
    this.assignTo(path);
  }
}
