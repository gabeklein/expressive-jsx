import { NodePath } from '@babel/traverse';
import { Program } from '@babel/types';

import { simpleHash } from '../helper/simpleHash';
import { Macro, Options } from '../options';
import { uniqueIdentifier } from '../syntax/function';
import { t } from '../types';
import { DefineContext } from './DefineContext';

const CONTEXT = new WeakMap<NodePath, Context>();

export class Context {
  parent: Context | undefined;
  define: Record<string, DefineContext> = {};
  macros: Record<string, Macro> = {};
  options: Options;
  uid = "";

  static get(from: NodePath){
    return CONTEXT.get(from)
  }

  constructor(
    input: Context | Options,
    public path?: NodePath){

    if(path)
      CONTEXT.set(path, this);

    if(input instanceof Context){
      this.define = Object.create(input.define);
      this.macros = Object.create(input.macros);
      this.options = input.options;
      this.parent = input;
      this.uid = simpleHash(input?.uid);
    }
    else if(path && path.isProgram()) {
      const name = (path.hub as any).file.opts.filename as string;
      
      if(!input.apply)
        throw new Error(`Plugin has not defined an apply method.`);

      if(input.polyfill === undefined)
        input.polyfill = require.resolve("../polyfill");

      this.define = Object.assign({}, ...input.define || []);
      this.macros = Object.assign({}, ...input.macros || []);
      this.options = input;
      this.uid = simpleHash(name);
    }
    else
      throw new Error("Invalid context input.");
  }

  has?(child: DefineContext): void;
  
  get(name: string){
    const defines = [] as DefineContext[];
    let mod: DefineContext;
    let { define } = this;

    while(mod = define[name]){
      defines.push(mod, ...mod.also);

      if(name == "this")
        break;

      define = Object.getPrototypeOf(define);
    }

    return defines.reverse();
  }

  getHelper(name: string){
    let context: Context = this;

    while(context.parent)
      context = context.parent;

    const { polyfill } = context.options;
    const program = context.path as NodePath<Program>;
    const body = (program as NodePath<Program>).get("body");
  
    for(const statement of body){
      if(!statement.isImportDeclaration()
      || statement.node.source.value !== polyfill)
        continue;
  
      const specifiers = statement.get("specifiers");
  
      for(const spec of specifiers){
        if(!spec.isImportSpecifier())
          continue;
  
        if(t.isIdentifier(spec.node.imported, { name }))
          return spec.node.local;
      }
    }
  
    const concat = uniqueIdentifier(program.scope, name);
  
    if(polyfill){
      const importStatement = t.importDeclaration(
        [t.importSpecifier(concat, t.identifier(name))],
        t.stringLiteral(polyfill)
      );
    
      program.unshiftContainer("body", importStatement);
    }
  
    return concat;
  }
}

export function getContext(path: NodePath){
  while(path){
    const context = CONTEXT.get(path);

    if(context instanceof Context)
      return context;

    path = path.parentPath!;
  }

  throw new Error("Context not found");
}