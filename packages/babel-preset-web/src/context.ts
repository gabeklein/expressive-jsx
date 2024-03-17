import { ElementContext } from './elements';
import { simpleHash } from './helper/simpleHash';
import { Macro, Options } from './options';
import { onExit } from './plugin';
import { getProp, getProps } from './syntax/function';
import { getName } from './syntax/names';
import { t } from './types';

import type { NodePath, Scope } from '@babel/traverse';
import type { BlockStatement, Expression, Function, Identifier, Node, ObjectProperty, Program } from '@babel/types';

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

  get component(): FunctionContext {
    let ctx: Context | undefined = this;

    while(ctx = ctx.parent)
      if(ctx instanceof FunctionContext)
        return ctx;

    throw new Error("Component not found.");
  }

  add(child: DefineContext){
    if(child.name)
      this.define[child.name] = child;
  }
  
  get(name: string){
    const defines = [] as DefineContext[];
    let mod: DefineContext;
    let { define } = this;

    while(mod = define[name]){
      defines.push(mod, ...mod.also);

      if(mod instanceof FunctionContext)
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

export class DefineContext extends Context {
  also = new Set<DefineContext>();
  styles: Record<string, string | unknown[]> = {};
  usedBy = new Set<ElementContext>();
  within?: DefineContext;
  dependant: DefineContext[] = [];

  constructor(
    public name: string,
    public parent: Context,
    public path: NodePath){

    super(parent, path);
    this.uid = name + "_" + simpleHash(parent?.uid);
  }

  get empty(){
    return Object.keys(this.styles).length === 0;
  }

  get className(): string | Expression | null {
    return this.uid;
  }

  get selector(){
    let selector = `.${this.uid}`;

    for(let x = this.within; x; x = x.within)
      selector = `.${x.uid} ${selector}`;

    return selector;
  }
  
  macro(name: string, args: any[]){
    const queue = [{ name, args }];

    while(queue.length){
      const { name, args } = queue.pop()!;
      const macro = this.macros[name];
      const apply = (args: any) => {
        this.styles[name] = args;
      }
   
      if(!macro){
        apply(args);
        continue;
      }
  
      const output = macro.apply(this, args);
  
      if(!output)
        continue;
  
      if(Array.isArray(output)){
        apply(output);
        continue;
      }
      
      if(typeof output != "object")
        throw new Error("Invalid modifier output.");
  
      for(const key in output){
        let args = output[key];
  
        if(args === undefined)
          continue;

        if(!Array.isArray(args))
          args = [args];
  
        if(key === name)
          apply(args);
        else
          queue.push({ name: key, args });
      }
    }
  }
}

export class FunctionContext extends DefineContext {
  body: NodePath<BlockStatement | Expression>;

  constructor(public path: NodePath<Function>){
    const name = getName(path);
    const ctx = getContext(path);

    onExit(path, () => {
      const body = path.get("body");

      if(body.isBlockStatement() && body.node.body.length == 0)
        body.pushContainer("body", t.expressionStatement(
          t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier("this"), [], true),
            undefined, [], true
          )
        ));
    });

    super(name, ctx, path);
  
    this.define["this"] = this;
    this.body = path.get("body");
  }

  get className(){
    const used =
      Object.keys(this.styles).length ||
      this.dependant.length;
    
    return used ? super.className : null;
  }

  getProp(name: string){
    return getProp(this.path, name);
  }

  getProps(){
    return getProps(this.path);
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

export function uniqueIdentifier(scope: Scope, name = "temp") {
  let uid = name;
  let i = 0;

  do {
    if(i > 0) uid = name + i;
    i++;
  } while (
    scope.hasLabel(uid) ||
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid) ||
    scope.hasReference(uid)
  );

  return t.identifier(uid);
}