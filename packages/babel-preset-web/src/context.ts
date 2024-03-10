import { ElementContext } from './elements';
import { simpleHash } from './helper/simpleHash';
import { Macro } from './options';
import { getProp, getRestProps } from './syntax/component';
import { getName } from './syntax/entry';
import * as t from './types';

export const CONTEXT = new WeakMap<t.NodePath, Context>();

export class Context {
  define: Record<string, DefineContext> = {};
  macros: Record<string, Macro> = {};

  constructor(
    public path: t.NodePath,
    public parent?: Context){

    CONTEXT.set(path, this);

    if(!parent)
      return;

    this.define = Object.create(parent.define);
    this.macros = Object.create(parent.macros);
  }

  get uid(): string {
    return simpleHash(this.parent?.uid);
  }

  get component(): FunctionContext | undefined {
    let ctx: Context | undefined = this;

    while(ctx = ctx.parent)
      if(ctx instanceof FunctionContext)
        return ctx;
  }

  add(child: DefineContext){
    if(child.name)
      this.define[child.name] = child;
  }
  
  get(name: string){
    const defines = [] as DefineContext[];
    let mod: DefineContext;
    let { define } = this;

    while(mod = define[name]){
      defines.push(mod, ...mod.also);

      if(mod instanceof FunctionContext)
        break;

      define = Object.getPrototypeOf(define);
    }

    return defines.reverse();
  }
}

export class DefineContext extends Context {
  also = new Set<DefineContext>();
  styles: Record<string, string | unknown[]> = {};
  usedBy = new Set<ElementContext>();
  within?: DefineContext;
  dependant: DefineContext[] = [];

  constructor(
    public name: string,
    public parent: Context,
    path: t.NodePath<t.Node>){

    super(path, parent);
  }

  get uid(): string {
    const uid = this.name + "_" + simpleHash(this.parent?.uid);
    Object.defineProperty(this, "uid", { value: uid });
    return uid;
  }

  get className(): string | t.Expression | null {
    return this.uid;
  }

  get selector(){
    let selector = `.${this.uid}`;

    for(let x = this.within; x; x = x.within)
      selector = `.${x.uid} ${selector}`;

    return selector;
  }
  
  macro(name: string, args: any[]){
    const queue = [{ name, args }];

    while(queue.length){
      const { name, args } = queue.pop()!;
      const macro = this.macros[name];
      const apply = (args: any) => {
        this.styles[name] = args;
      }
   
      if(!macro){
        apply(args);
        continue;
      }
  
      const output = macro.apply(this, args);
  
      if(!output)
        continue;
  
      if(Array.isArray(output)){
        apply(output);
        continue;
      }
      
      if(typeof output != "object")
        throw new Error("Invalid modifier output.");
  
      for(const key in output){
        let args = output[key];
  
        if(args === undefined)
          continue;

        if(!Array.isArray(args))
          args = [args];
  
        if(key === name)
          apply(args);
        else
          queue.push({ name: key, args });
      }
    }
  }
}

export class FunctionContext extends DefineContext {
  body: t.NodePath<t.BlockStatement | t.Expression>;

  constructor(public path: t.NodePath<t.Function>){
    const name = getName(path);
    const ctx = getContext(path);

    super(name, ctx, path);
  
    this.define["this"] = this;
    this.body = path.get("body");
  }

  get className(){
    const used =
      Object.keys(this.styles).length ||
      this.dependant.length;
    
    return used ? super.className : null;
  }

  getProp(name: string){
    return getProp(this.path, name);
  }

  getProps(){
    return getRestProps(this.path)
  }
}

export function getContext(path: t.NodePath){
  while(path){
    const context = CONTEXT.get(path);

    if(context instanceof Context)
      return context;

    path = path.parentPath!;
  }

  throw new Error("Context not found");
}