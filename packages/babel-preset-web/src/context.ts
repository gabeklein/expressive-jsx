import { ElementContext } from './elements';
import { simpleHash } from './helper/simpleHash';
import { Macro } from './options';
import { getName } from './syntax/entry';
import * as t from './types';

export const CONTEXT = new WeakMap<t.NodePath, Context>();

export class Context {
  define: Record<string, DefineContext> = {};
  macros: Record<string, Macro> = {};

  apply?: (this: ElementContext, element: ElementContext) => void;

  get uid(): string {
    return simpleHash(this.parent?.uid);
  }

  constructor(public parent?: Context){
    if(!parent)
      return;

    this.define = Object.create(parent.define);
    this.macros = Object.create(parent.macros);
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
  dependant: DefineContext[] = [];

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

  constructor(
    public name: string,
    public parent: Context){

    super(parent);
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

  constructor(path: t.NodePath<t.Function>){
    const name = getName(path);
    const ctx = getContext(path);

    super(name, ctx);
  
    this.assignTo(path);
    this.define["this"] = this;
    this.body = path.get("body");
  }

  get className(){
    const used =
      Object.keys(this.styles).length ||
      this.dependant.length;
    
    return used ? super.className : null;
  }
}

export class SelectorContext extends DefineContext {
  selects: string;
  
  constructor(
    public parent: DefineContext,
    public path: t.NodePath<t.IfStatement>){

    const test = path.node.test as t.StringLiteral;

    super(test.value, parent);
    parent.dependant.push(this);
    this.selects = test.value;
    this.assignTo(path);
  }

  get selector(){
    return this.parent.selector + this.selects;
  }

  get className(){
    return this.parent!.className;
  }

  add(child: DefineContext){
    child.within = this;
    super.add(child);
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

    return t.conditionalExpression(test, t.stringLiteral(uid), alt);
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
      this.dependant.push(alternate);
    }

    return alternate;
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