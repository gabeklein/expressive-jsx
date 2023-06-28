import { PluginPass } from '@babel/core';
import { getName } from 'parse/entry';
import * as t from 'syntax';
import { Options } from 'types';
import { hash } from 'utility';

import { Define } from './define';
import { ModifyAction } from './modify';
import { FileManager } from './scope';

const { create } = Object;

export class Context {
  root!: File;

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

    this.root.modifiersDeclared.add(value);

    Object.defineProperty(this, "define", {
      configurable: true,
      value
    });
    
    return value;
  }

  constructor(
    public name: string,
    parent?: Context | File){

    if(parent){
      this.macros = create(parent.macros);
      this.using = create(parent.using);
    }

    if(parent instanceof Context){
      this.parent = parent;
      this.root = parent.root;
      this.using.this = this;

      parent.using[name] = this;
    }

    else if(parent instanceof File){
      this.root = parent;
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
        const context = new Context(getName(path), parent);

        path.data = { context };

        return context;
      }
    }
    while(path = path.parentPath!);

    throw new Error("No context found.");
  }
}

const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/css",
  pragma: "react",
  output: "js",
  macros: []
};

export class File {
  modifiersDeclared = new Set<Define>();
  file: FileManager;
  filename: string;
  options: Options;

  using: Record<string, Define> = {};

  /** Macros functions available for this scope. */
  macros: Record<string, ModifyAction> = {};

  constructor(path: t.Path<t.Program>, state: PluginPass){
    const { macros } = state.opts as Options;

    this.options = { ...DEFAULTS, ...state.opts };
    this.file = FileManager.create(this, path);
    this.filename = state.filename!;
    this.macros = Object.assign({}, ...macros);
  }
}