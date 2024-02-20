import { AbstractJSX } from './elements';
import { simpleHash } from './helper/simpleHash';
import { Macro, Options } from './options';
import { getName } from './syntax/entry';
import * as t from './types';

export const CONTEXT = new WeakMap<t.NodePath, Context>();

export abstract class Context {
  define: Record<string, DefineContext> = {};
  macros: Record<string, Macro> = {};

  assign!: (...args: any[]) => void;
  apply?(path: t.NodePath<t.JSXElement>): void;

  get uid(): string {
    const uid = this.name + "_" + simpleHash(this.parent?.uid);
    Object.defineProperty(this, "uid", { value: uid });
    return uid;
  }

  constructor(
    public name: string = "",
    public parent?: Context){

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
    let mod: DefineContext;
    let { define } = this;

    while(mod = define[name]){
      defines.push(mod, ...mod.also);

      if(name === "this")
        break;

      define = Object.getPrototypeOf(define);
    }

    return defines.reverse();
  }
}

export class ModuleContext extends Context {
  constructor(path: t.NodePath, options: Options){
    const { macros, define, assign } = options; 
    const name = (path.hub as any).file.opts.filename as string;
    
    super(name);

    if(!assign)
      throw new Error(`Plugin has not defined an assign method.`);

    this.assignTo(path);
    this.assign = assign;
    this.macros = Object.assign({}, ...macros || []);
    this.define = Object.assign({}, ...define || []);

    Object.defineProperty(this, "uid", { value: name });
  }
}

export class DefineContext extends Context {
  also = new Set<DefineContext>();
  styles: Record<string, string> = {};
  usedBy = new Set<AbstractJSX>();
  
  get className(){
    return this.uid as string | t.Expression;
  }

  constructor(
    public parent: Context,
    public path: t.NodePath){

    const name = getName(path);
    
    super(name, parent);
    this.assignTo(path);

    if(parent)
      parent.define[name] = this;
  }

  exit?(key: string | number | null): void;
  
  macro(name: string, args: any[]){
    const queue = [{ name, args }];

    while(queue.length){
      const { name, args } = queue.pop()!;
      const apply = (args: any[]) => {
        this.assign(name, ...args);
      }
  
      const macro = this.macros[name];
  
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
  constructor(path: t.NodePath<t.Function>){
    super(getContext(path), path);
    this.define["this"] = this;
  }
}

export class IfContext extends DefineContext {
  test: t.Expression;
  alternate?: DefineContext;
  
  constructor(
    public parent: Context,
    public path: t.NodePath<t.IfStatement>){

    super(parent, path);

    const test = this.test = path.node.test;

    if(t.isIdentifier(test))
      this.name = test.name;

    if(parent instanceof DefineContext)
      parent.also.add(this);

    Object.defineProperty(this, "className", {
      value: t.logicalExpression("&&",
        this.test, t.stringLiteral(this.uid)
      )
    });
  }

  alt(path: t.NodePath<t.Node>){
    return this.alternate || (
      this.alternate = new DefineContext(this.parent, path)
    );
  }

  exit(key: string | number | null): void {
    if(key === "alernate" || !this.alternate)
      this.path.remove();
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

export function createContext(path: t.NodePath): any {
  let parent = path.parentPath!;
  let key = path.key;

  if(parent.isBlockStatement()){
    parent = parent.parentPath!;
    key = parent.key;
  }

  const context = CONTEXT.get(parent);

  if(context instanceof IfContext)
    return key === "consequent" ? context : context.alt(path);

  if(context)
    return context;

  if(parent.isFunction())
    return new FunctionContext(parent);

  if(parent.isIfStatement())
    return new IfContext(createContext(parent), parent);

  throw new Error("Context not found");
}