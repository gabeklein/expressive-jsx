import { NodePath } from '@babel/traverse';
import { Expression } from '@babel/types';

import { simpleHash } from './helper/simpleHash';
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
}