import { NodePath } from '@babel/traverse';
import { Expression } from '@babel/types';

import { simpleHash } from '../helper/simpleHash';
import { Macro } from '../options';

const CONTEXT = new WeakMap<NodePath, Context>();

export class Context {
  parent: Context | undefined;
  define: Record<string, Define> = {};
  macros: Record<string, Macro> = {};
  uid = "";

  static get(from: NodePath){
    return CONTEXT.get(from)
  }

  constructor(
    public path: NodePath,
    input?: Context){

    CONTEXT.set(path, this);

    if(input instanceof Context){
      this.parent = input;
      this.uid = simpleHash(input.uid);
      this.define = Object.create(input.define);
      this.macros = Object.create(input.macros);
    }
    else if(!path.isProgram())
      throw new Error("Invalid context input.");
  }
  
  get(name: string){
    const apply = [] as Define[];
    let { define } = this;
    let mod: Define;

    while(mod = define[name]){
      apply.push(mod, ...mod.also);

      if(name == "this")
        break;

      define = Object.getPrototypeOf(define);
    }

    return apply.reverse();
  }
}

export class Define extends Context {
  also = new Set<Define>();
  styles: Record<string, string | unknown[]> = {};
  usedBy = new Set<Element>();
  dependant = new Set<Define>();
  selector: string;
  condition?: Expression | string;
  alternate?: Define;

  get empty(){
    return Object.keys(this.styles).length === 0;
  }

  constructor(
    public name: string,
    public parent: Context,
    public path: NodePath){

    super(path, parent);

    this.uid = name + "_" + simpleHash(parent.uid);

    let selector = `.${this.uid}`;

    for(let x = this.parent; x; x = x.parent!)
      if(x instanceof Define && x.condition){
        selector = x.selector + " " + selector;
        x.dependant.add(this);
      }

    this.selector = selector;
  }

  macro(name: string, args: any[]){
    const queue = [{ name, args }];

    while(queue.length){
      const { name, args } = queue.pop()!;
      const macro = this.macros[name];
      const apply = (args: any) => {
        this.styles[name] = args;
      };

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

export class Element extends Context {
  using = new Set<Define>();

  get(name: string){
    const mods = new Set<Define>();

    for(const ctx of [this.parent!, ...this.using])
      ctx.get(name).forEach(x => mods.add(x));

    return Array.from(mods);
  }

  use(name: string | Define){
    const apply = typeof name == "string"
      ? this.get(name) : [name];

    apply.forEach(context => {
      context.usedBy.add(this);
      this.using.add(context);
    });

    return apply;
  }
}