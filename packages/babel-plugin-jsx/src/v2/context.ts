import * as t from 'syntax';
import { hash } from 'utility';

import { Define } from './define';
import { ModifyAction } from './modify';
import { File } from './scope';

const { create } = Object;

export class Context {
  file!: File;

  /** Used to supply JSX child components with nested defintion. */
  using: Record<string, Define>;

  /** Macros functions available for this scope. */
  macros: Record<string, ModifyAction> = {};

  parent?: Context;

  name?: string;

  constructor(
    parent?: Context,
    name?: string){

    this.name = name;
    this.parent = parent;
    this.using = {};

    if(parent){
      this.macros = create(parent.macros);
      this.using = create(parent.using);
      this.file = parent.file;
    }
  }

  path(salt?: string | number){
    let path = "";

    for(let ctx: Context = this; ctx; ctx = ctx.parent!)
      path += ctx.name;

    return hash(path + salt);
  }

  static get(path: t.Path<t.Node>){
    do {
      if(path.data){
        const { context } = path.data;
  
        if(context instanceof Context)
          return context;
      }
    }
    while(path = path.parentPath!);

    throw new Error("No context found.");
  }
}