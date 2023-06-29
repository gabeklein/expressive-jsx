import { getName } from 'parse/entry';
import * as t from 'syntax';
import { hash } from 'utility';

import { Define } from './define';
import { ModifyAction } from './modify';
import { File } from './scope';

const { create } = Object;

export class Context {
  file!: File;

  /** Used to supply JSX child components with nested defintion. */
  using: Record<string, Context>;

  /** Macros functions available for this scope. */
  macros: Record<string, ModifyAction> = {};

  parent?: Context;

  /** Modifiers applicable to JSX elements with this scope. */
  define: Define;

  name?: string;

  constructor(
    parent?: Context,
    name?: string){

    if(parent){
      this.macros = create(parent.macros);
      this.using = create(parent.using);
      this.file = parent.file;
      this.using.this = this;

      if(name)
        parent.using[name] = this;
    }

    this.name = name;
    this.parent = parent;
    this.define = new Define(this);
    this.using = { "this": this };
  }

  path(salt?: string | number){
    let path = "";

    for(let ctx: Context = this; ctx; ctx = ctx.parent!)
      path += ctx.name;

    return hash(path + salt);
  }

  static get(path: t.Path<t.Node>): Context {
    do {
      if(path.data){
        const { context } = path.data;
  
        if(context instanceof Context)
          return context;
      }
      else if(path.isFunction()){
        const parent = this.get(path.parentPath);
        const context = new Context(parent, getName(path));

        path.data = { context };

        return context;
      }
    }
    while(path = path.parentPath!);

    throw new Error("No context found.");
  }
}