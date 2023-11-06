import { Define } from 'handle/definition';
import { builtIn } from 'handle/macros';
import { getName } from 'parse/entry';
import { FileManager } from 'scope';
import { hash } from 'utility';

import type * as $ from 'types';
import type { ModifyAction } from 'parse/labels';
import type { Options } from 'index';

export interface BabelState<S extends Context = Context> {
  file: File;
  filename: string;
  cwd: string;
  context: S;
  opts: Options;
}

const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/css",
  pragma: "react",
  output: "js",
  macros: []
};

export class Context {
  name: string;
  filename: string;
  module: any;

  options: Options;
  file: FileManager;

  declared = new Set<Define>();
  modifiers: Record<string, Define> = {};
  macros: Record<string, ModifyAction>;
  define: Define;

  program: $.Path<$.Program>;

  declaredUIDIdentifiers: Record<string, $.Identifier> = {};

  get parent(){
    return Object.getPrototypeOf(this);
  }

  constructor(
    path: $.Path<$.Program>,
    state: BabelState){

    const { module, macros } = state.opts;

    path.data = { context: this };

    this.options = { ...DEFAULTS, ...state.opts };
    this.macros = Object.assign({}, builtIn, ...macros || []);
    this.file = FileManager.create(this.options, path);

    this.program = path;
    this.name = hash(state.filename);
    this.filename = state.filename;
    this.define = new Define(this, this.name);
    this.module = module && (
      typeof module == "string" ? module :
        (state.file as any).opts.configFile?.name || true
    )
  }

  ensureUIDIdentifier(name: string){
    const exist = this.declaredUIDIdentifiers;

    return exist[name] || (
      exist[name] = this.file.ensureUIDIdentifier(name)
    );
  }

  close(){
    this.file.close();
  }

  getHandler(named: string, ignoreOwn = false){
    let context = this as any;

    if(ignoreOwn)
      for(let found; !found;){
        found = context.handlers.has(named);
        context = context.parent;
      }

    const [key, ...path] = named.split(".");
    let handler = this.macros[key];

    for(const key of path)
      handler = (handler as any)[key];

    return handler as ModifyAction | undefined;
  }

  static get(path: $.Path<any>, create?: boolean): Context {
    while(path = path.parentPath!){
      const scope = path.data?.context as Context | undefined;
  
      if(scope)
        return scope;
  
      if(!path.isBlockStatement() || !create)
        continue;
  
      const parentContext = this.get(path);
  
      if(!parentContext)
        throw new Error("well that's awkward.");
  
      const name = getName(path.parentPath);
      const define = new Define(parentContext, name);
      const { context } = define;
  
      if(path.node)
        path.data = { context };
    
      context.name = getName(path.parentPath);
    
      return context;
    }
  
    throw new Error("Scope not found!");
  }
}