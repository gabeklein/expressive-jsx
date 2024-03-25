import { NodePath } from '@babel/traverse';
import { Expression } from '@babel/types';

import { simpleHash } from '../helper/simpleHash';
import { Macro } from '../options';

const CONTEXT = new WeakMap<NodePath, Context>();

export class Context {
  parent: Context | undefined;
  define: Record<string, Context> = {};
  macros: Record<string, Macro> = {};
  uid = "";

  also = new Set<Context>();
  props = new Map<string, any>();
  usedBy = new Set<Element>();
  children = new Set<Context>();
  condition?: Expression | string;
  alternate?: Context;

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
    const apply = [] as Context[];
    let { define } = this;
    let mod: Context;

    while(mod = define[name]){
      apply.push(mod, ...mod.also);

      if(name == "this")
        break;

      define = Object.getPrototypeOf(define);
    }

    return apply.reverse();
  }

  macro(name: string, args: any[]){
    const queue = [{ name, args }];

    while(queue.length){
      const { name, args } = queue.pop()!;
      const macro = this.macros[name];
      const apply = (args: any) => {
        this.props.set(name, args);
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

export class Define extends Context {
  constructor(
    public path: NodePath,
    public name: string,
    public parent: Context){

    super(path, parent);

    this.uid = name + "_" + simpleHash(parent.uid);

    for(let x = this.parent; x; x = x.parent!)
      if(x.condition)
        x.children.add(this);
  }
}

export class Element extends Context {
  using = new Set<Context>();

  get(name: string){
    const mods = new Set<Context>();

    for(const ctx of [this.parent!, ...this.using])
      ctx.get(name).forEach(x => mods.add(x));

    return Array.from(mods);
  }

  use(name: string | Context){
    const apply = typeof name == "string"
      ? this.get(name) : [name];

    apply.forEach(context => {
      context.usedBy.add(this);
      this.using.add(context);
    });

    return apply;
  }
}