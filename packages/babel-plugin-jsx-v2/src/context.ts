import { Macro } from '.';
import { getName } from './entry';
import { simpleHash } from './helper/simpleHash';
import * as t from './types';

export const CONTEXT = new WeakMap<t.NodePath, Context>();

export class Context {
  name = "";
  define: Record<string, DefineContext> = {};
  macros: Record<string, Macro> = {};

  get uid(): string {
    const uid = this.name + "_" + simpleHash(this.parent?.uid);
    Object.defineProperty(this, "uid", { value: uid });
    return uid;
  }

  constructor(public parent?: Context){
    if(!parent)
      return;

    this.define = Object.create(parent.define);
    this.macros = Object.create(parent.macros);
  }

  assignTo(path: t.NodePath){
    CONTEXT.set(path, this);
  }
}

export class ModuleContext extends Context {
  constructor(path: t.NodePath){
    const filename = (path.hub as any).file.opts.filename;

    super();
    this.assignTo(path);
    Object.defineProperty(this, "uid", {
      value: simpleHash(filename)
    });
  }
}

export class DefineContext extends Context {
  name = "";
  styles: Record<string, string> = {};
  
  get className(){
    return t.stringLiteral(this.uid);
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
  constructor(public path: t.NodePath<t.Function>){
    super(getContext(path, false));
    this.assignTo(path);
    this.name = getName(path);
  }
}

export function getContext(path: t.NodePath, required?: true): DefineContext;
export function getContext(path: t.NodePath, required: boolean): DefineContext | undefined;
export function getContext(path: t.NodePath, required?: boolean){
  while (path) {
    const context = CONTEXT.get(path);

    if(context instanceof DefineContext)
      return context;

    path = path.parentPath!;
  }

  if(required !== false)
    throw new Error("Context not found");
}