import { NodePath } from '@babel/traverse';
import { Expression } from '@babel/types';

import { simpleHash } from './helper/simpleHash';
import { camelToDash } from './macros/util';
import { BabelState, Macro } from './options';

const CONTEXT = new WeakMap<NodePath, Context>();

export class Context {
  path: NodePath;
  parent: Context | undefined;
  define: Record<string, Context> = {};
  macros: Record<string, Macro> = {};
  uid = "";

  also = new Set<Context>();
  props = new Map<string, any>();
  usedBy = new Set<NodePath>();
  children = new Set<Context>();
  condition?: Expression | string;
  alternate?: Context;

  static get(from: NodePath){
    return CONTEXT.get(from)
  }

  constructor(
    path: NodePath,
    parent?: Context | BabelState,
    name?: string){

    CONTEXT.set(path, this);
    this.path = path;

    if(parent instanceof Context){
      this.uid = name + "_" + simpleHash(parent.uid);
      this.parent = parent;
      this.define = Object.create(parent.define);
      this.macros = Object.create(parent.macros);

      do if(parent.condition){
        parent.children.add(this);
      }
      while(parent = parent.parent)
    }
    else if(parent){
      this.uid = simpleHash(parent.filename!);
      this.define = Object.assign({}, ...parent.opts.define || []);
      this.macros = Object.assign({}, ...parent.opts.macros || []);
    }
    else
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
        const key = /^\$/.test(name)
          ? `--${camelToDash(name.slice(1))}`
          : name

        this.props.set(key, args);
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