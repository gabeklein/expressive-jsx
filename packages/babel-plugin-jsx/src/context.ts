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

const AMBIENT = new WeakMap<StackFrame, Define>();

export function getContext(
  path: t.Path<any>, create?: boolean): StackFrame {

  while(path = path.parentPath){
    const scope = path.data as StackFrame | undefined;

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

export class StackFrame {
  name: string;
  filename: string;
  module: any;

  opts: Options;
  program: FileManager;

  modifiersDeclared = new Set<Define>();
  modifiers = {} as BunchOf<Define>;
  handlers = {} as BunchOf<ModifyAction>;

  get parent(){
    return Object.getPrototypeOf(this);
  }

  get ambient(){
    const ambient = AMBIENT.get(this);

    if(ambient)
      return ambient;

    return new Define(this, this.name);
  }

  set ambient(item: Define){
    AMBIENT.set(this, item);
  }

  constructor(
    path: t.Path<t.BabelProgram>,
    state: BabelState){

    const options = { ...DEFAULTS, ...state.opts };

    this.opts = options;
    this.name = hash(state.filename);
    this.filename = state.filename;
    this.module = (state.file as any).opts.configFile;
    this.program = FileManager.create(this, path, options);
  
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