import { Define } from 'handle/definition';
import { builtIn } from 'modifier/builtIn';
import { containerName } from 'parse/entry';
import { FileManager } from 'scope';
import { hash } from 'utility';

import type * as t from 'syntax/types';
import type { BabelState, BunchOf, ModifyAction, Options } from 'types';

const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/css",
  pragma: "react",
  output: "js",
  modifiers: []
};

export class Context {
  name: string;
  filename: string;
  module: any;

  options: Options;
  program: FileManager;

  declared = new Set<Define>();
  modifiers = {} as BunchOf<Define>;
  handlers = {} as BunchOf<ModifyAction>;
  ambient: Define;

  get parent(){
    return Object.getPrototypeOf(this);
  }

  constructor(
    path: t.Path<t.BabelProgram>,
    state: BabelState){

    const options = this.options = {
      ...DEFAULTS,
      ...state.opts
    };

    this.name = hash(state.filename);
    this.filename = state.filename;
    this.program = FileManager.create(this, path);
    this.ambient = new Define(this, this.name);

    this.module = options.module && (
      typeof options.module == "string"
        ? options.module
        : (state.file as any).opts.configFile?.name || true
    )
  
    path.data = this;
    Object.assign(this.handlers, builtIn, ...options.modifiers);
  }

  getHandler(named: string, ignoreOwn = false){
    let context = this as any;

    if(ignoreOwn)
      for(let found; !found;){
        found = context.handlers.has(named);
        context = context.parent;
      }

    const [key, ...path] = named.split(".");
    let handler = this.handlers[key];

    for(const key of path)
      handler = (handler as any)[key];

    return handler;
  }
}

export function getContext(
  path: t.Path<any>, create?: boolean): Context {

  while(path = path.parentPath){
    const scope = path.data as Context | undefined;

    if(scope)
      return scope;

    if(!path.isBlockStatement() || !create)
      continue;

    const parentContext = getContext(path);

    if(!parentContext)
      throw new Error("well that's awkward.");

    const name = containerName(path);
    const define = new Define(parentContext, name);
    const { context } = define;

    if(path.node)
      path.data = context;
  
    context.name = containerName(path);
  
    return context;
  }

  throw new Error("Scope not found!");
}