import * as t from '@babel/types';

import { Macro } from '.';
import { getName } from './entry';

export const CONTEXT = new WeakMap<NodePath, Context>();

import type { NodePath } from '@babel/traverse';

export class Context {
  define: Record<string, DefineContext> = {};
  macros: Record<string, Macro> = {};

  constructor(public parent?: Context){
    if(!parent)
      return;

    this.define = Object.create(parent.define);
    this.macros = Object.create(parent.macros);
  }

  assignTo(path: NodePath){
    CONTEXT.set(path, this);
  }
}

export class ModuleContext extends Context {
  constructor(path: NodePath){
    super();
    this.assignTo(path);
  }
}

export class DefineContext extends Context {
  name = "";
  styles: Record<string, string> = {};

  apply(path: NodePath<t.JSXElement>){

  }

  get(name: string): DefineContext[] {
    if(name === "this"){
      let ctx: Context = this;
  
      do {
        if(ctx instanceof FunctionContext)
          return [ctx];
      }
      while(ctx = ctx.parent!);
      
      return [];
    }

    const defines = [] as DefineContext[];

    for(let { define } = this; define[name]; define = Object.getPrototypeOf(define))
      defines.push(define[name]);

    return defines.reverse();
  }
}

export class FunctionContext extends DefineContext {
  constructor(public path: NodePath<t.Function>){
    super(getContext(path));
    this.assignTo(path);
    this.name = getName(path);
  }
}

export function getContext(path: NodePath, required?: true): DefineContext;
export function getContext(path: NodePath, required: boolean): DefineContext | undefined;
export function getContext(path: NodePath, required?: boolean){
  while (path) {
    const context = CONTEXT.get(path);

    if(context instanceof DefineContext)
      return context;

    path = path.parentPath!;
  }

  if(required !== false)
    throw new Error("Context not found");
}