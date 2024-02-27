import { ElementContext } from './elements';
import { simpleHash } from './helper/simpleHash';
import { Macro } from './options';
import { getName } from './syntax/entry';
import * as t from './types';

export const CONTEXT = new WeakMap<t.NodePath, Context>();

export class Context {
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

  add(child: DefineContext){
    if(child.name)
      this.define[child.name] = child;
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

export class DefineContext extends Context {
  also = new Set<DefineContext>();
  styles: Record<string, string | unknown[]> = {};
  usedBy = new Set<ElementContext>();
  within?: DefineContext;
  
  get className(): string | t.Expression | null {
    return this.uid;
  }

  constructor(name: string, parent: Context){
    super(name, parent);
    parent.add(this);
  }

  exit?(key: string | number | null): void;
  
  macro(name: string, args: any[]){
    const queue = [{ name, args }];

    while(queue.length){
      const { name, args } = queue.pop()!;
      const macro = this.macros[name];
      const apply = (args: any[]) => {
        this.styles[name] = args;
        this.assign(name, ...args);
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

  constructor(path: t.NodePath<t.Function>){
    const name = getName(path);
    const ctx = getContext(path);

    super(name, ctx);
  
    this.assignTo(path);
    this.define["this"] = this;
    this.body = path.get("body");
  }

  get className(){
    return Object.keys(this.styles).length > 0
      ? super.className
      : null;
  }

  exit(){
    const { body } = this;

    if(!body.isBlockStatement() || body.node.body.length > 0)
      return;

    body.replaceWith(t.blockStatement([
      t.returnStatement(
        t.jsxElement(
          t.jsxOpeningElement(t.jsxIdentifier("this"), [], true),
          undefined, [], true
        )
      )
    ]));
  }
}

export class IfContext extends DefineContext {
  test: t.Expression;
  alternate?: DefineContext;
  
  constructor(
    public parent: Context,
    public path: t.NodePath<t.IfStatement>){

    const test = path.node.test;
    const name = t.isIdentifier(test) ? test.name : getName(path);

    super(name, parent);

    this.assignTo(path);
    this.test = test;

    if(t.isIdentifier(test))
      this.name = test.name;

    if(parent instanceof DefineContext)
      parent.also.add(this);
  }

  get className(){
    const { test, alternate, uid } = this;

    if(!alternate)
      return t.logicalExpression("&&", test, t.stringLiteral(uid));

    let alt = alternate.className!;

    if(typeof alt === "string")
      alt = t.stringLiteral(alt);

    return t.conditionalExpression(
      test,
      t.stringLiteral(uid),
      alt
    );
  }

  add(child: DefineContext){
    child.within = this;
    super.add(child);
  }

  for(key: unknown){
    if(key === "consequent")
      return this;

    let { alternate, parent, name } = this;

    if(!alternate){
      alternate = new DefineContext("not_" + name, parent);
      this.alternate = alternate;
    }

    return alternate;
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
    return context.for(key);

  if(context)
    return context;

  if(parent.isFunction())
    return new FunctionContext(parent);

  if(parent.isIfStatement())
    return new IfContext(createContext(parent), parent);

  throw new Error("Context not found");
}