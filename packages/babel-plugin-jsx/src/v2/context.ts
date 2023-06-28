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
  using: Record<string, Context> = {
    "this": this
  };

  /** Macros functions available for this scope. */
  macros: Record<string, ModifyAction> = {};

  parent?: Context;

  /** Modifiers applicable to JSX elements with this scope. */
  get define(){
    const value = new Define(this, this.name);

    Object.defineProperty(this, "define", {
      configurable: true,
      value
    });
    
    return value;
  }

  constructor(
    within: Context | File,
    public name: string){

    if(within instanceof File){
      this.file = within;
    }
    else if(within instanceof Context){
      this.macros = create(within.macros);
      this.using = create(within.using);
  
      this.parent = within;
      this.file = within.file;
      this.using.this = this;

      within.using[name] = this;
    }
  }

  exit?(): void;

  applicable(name: string){
    const list = new Set<Context>();
    let ctx: Context = this;

    do {
      if(ctx.using.hasOwnProperty(name))
        list.add(ctx.using[name]);
    }
    while(ctx = ctx.parent!);

    return list;
  }

  getHandler(named: string, ignoreOwn = false){
    let context: Context | undefined = this;

    if(ignoreOwn)
      for(let found; !found && context;){
        found = context.using.hasOwnProperty(named);
        context = context.parent; 
      }

    const [key, ...path] = named.split(".");
    let handler = this.macros[key] as ModifyAction | undefined;

    for(const key of path)
      handler = (handler as any)[key];

    return handler;
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

        continue;
      }

      if(path.isFunction()){
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