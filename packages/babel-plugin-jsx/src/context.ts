import { NodePath } from '@babel/traverse';
import { Expression } from '@babel/types';

import type { Macro } from './options';

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
    parent?: Context,
    name?: string){

    CONTEXT.set(path, this);
    this.path = path;

    if(!(parent instanceof Context))
      return;

    this.parent = parent;
    this.uid = name + "_" + hash(parent.uid);
    this.define = Object.create(parent.define);
    this.macros = Object.create(parent.macros);

    do if(parent.condition){
      parent.children.add(this);
    }
    while(parent = parent.parent)
  }
}

export function hash(
  input: string = String(Math.random()),
  length = 3){

  let hash = 0;
  if (input.length === 0) return '';

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }

  // Convert the hash to a base36 string
  return Math.abs(hash).toString(36).substring(0, length);
}