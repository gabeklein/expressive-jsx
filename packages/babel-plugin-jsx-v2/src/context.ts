import { getName } from './entry';
import { simpleHash } from './helper/simpleHash';
import { Macro } from './options';
import * as t from './types';

export const CONTEXT = new WeakMap<t.NodePath, Context>();

export abstract class Context {
  name = "";
  define: Record<string, DefineContext> = {};
  macros: Record<string, Macro> = {};

  get uid(): string {
    const uid = this.name + "_" + simpleHash(this.parent?.uid);
    Object.defineProperty(this, "uid", { value: uid });
    return uid;
  }

  assign!: (...args: any[]) => void;
  apply?(path: t.NodePath<t.JSXElement>): void;

  constructor(public parent?: Context){
    if(!parent)
      return;

    this.define = Object.create(parent.define);
    this.macros = Object.create(parent.macros);
    this.assign = parent.assign;
    this.apply = parent.apply;
  }

  assignTo(path: t.NodePath){
    CONTEXT.set(path, this);
  }
  
  get(name: string){
    const defines = [] as DefineContext[];

    for(let { define } = this; define[name]; define = Object.getPrototypeOf(define))
      defines.push(define[name]);

    return defines.reverse();
  }
}

export class ModuleContext extends Context {
  constructor(path: t.NodePath){
    super();
    this.assignTo(path);
    Object.defineProperty(this, "uid", {
      value: (path.hub as any).file.opts.filename
    });
  }
}

export class DefineContext extends Context {
  name: string;
  styles: Record<string, string> = {};

  constructor(parent: Context | undefined, public path: t.NodePath){
    super(parent);

    const name = this.name = getName(path);
    this.assignTo(path);

    if(parent)
      parent.define[name] = this;
  }
  
  get className(){
    return t.stringLiteral(this.uid);
  }

  get(name: string): DefineContext[] {
    if(name !== "this")
      return super.get(name);
  
    for(let ctx: Context = this; ctx; ctx = ctx.parent!)
      if(ctx instanceof FunctionContext)
        return [ctx];
      
      return [];
  }
}

export class FocusContext extends Context {
  using = new Set<DefineContext>();

  get(name: string){
    const mods = new Set<DefineContext>();
    
    for(const def of this.using)
      def.get(name).forEach(x => mods.add(x));

    return Array.from(mods);
  }
}

export class FunctionContext extends DefineContext {
  constructor(public path: t.NodePath<t.Function>){
    super(getContext(path), path);
  }
}

export function getContext(path: t.NodePath){
  while (path) {
    const context = CONTEXT.get(path);

    if(context instanceof Context)
      return context;

    path = path.parentPath!;
  }

  throw new Error("Context not found");
}