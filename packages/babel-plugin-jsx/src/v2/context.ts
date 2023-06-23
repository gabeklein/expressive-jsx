import { NodePath } from '@babel/traverse';
import { Node, Program } from '@babel/types';

import { Define } from './define';
import { ModifyAction } from './modify';
import { hash } from 'utility';
import { getLocalFilename } from 'parse/entry';
import { PluginPass } from '@babel/core';
import { Options } from 'types';
import { FileManager } from './scope';

const { create } = Object;

export class Context {
  root!: RootContext;

  /** Used to supply JSX child components with nested defintion. */
  children: Record<string, Context> = {};

  /** Macros functions available for this scope. */
  macros: Record<string, ModifyAction> = {};

  /** Modifiers applicable to JSX elements with this scope. */
  get define(){
    const value = new Define(this, this.name);

    this.root.modifiersDeclared.add(value);

    Object.defineProperty(this, "define", {
      value,
      configurable: true
    });
    
    return value;
  }

  constructor(
    public name: string,
    public parent?: Context){

    if(parent){
      this.root = parent.root;
      this.macros = create(parent.macros);
      parent.children[name] = this;
    }
  }

  exit?(): void;

  getHandler(named: string, ignoreOwn = false){
    let context: Context | undefined = this;

    if(ignoreOwn)
      for(let found; !found && context;){
        found = context.children.hasOwnProperty(named);
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

  static get(path: NodePath<Node>): Context {
    do {
      if(!path.data)
        continue;

      const { context } = path.data;

      if(context instanceof Context)
        return context;

      if(path.isFunction()){
        const parent = this.get(path);
        const context = new Context("File", parent);

        path.data = { context };

        return context;
      }

      if(path.isIfStatement())
        throw new Error("If statements are not supported.");
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

export class RootContext extends Context {
  modifiersDeclared = new Set<Define>();
  file: FileManager;
  filename: string;
  options: Options;

  constructor(path: NodePath<Program>, state: PluginPass){
    const { macros } = state.opts as Options;

    super(getLocalFilename(path.hub));

    this.options = { ...DEFAULTS, ...state.opts };
    this.file = FileManager.create(this, path);
    this.filename = state.filename!;
    this.macros = Object.assign({}, ...macros);
    this.root = this;
  }
}