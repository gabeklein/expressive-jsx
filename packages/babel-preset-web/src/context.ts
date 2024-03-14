import { ElementContext } from './elements';
import { simpleHash } from './helper/simpleHash';
import { Macro, Options } from './options';
import { onExit } from './plugin';
import { getName } from './syntax/entry';
import { t } from './types';

import type { NodePath, Scope } from '@babel/traverse';
import type { BlockStatement, Expression, Function, Identifier, Node, ObjectProperty, Program } from '@babel/types';

const CONTEXT = new WeakMap<NodePath, Context>();

export class Context {
  module!: ModuleContext;
  define: Record<string, DefineContext> = {};
  macros: Record<string, Macro> = {};

  static get(from: NodePath){
    return CONTEXT.get(from)
  }

  constructor(
    public path?: NodePath,
    public parent?: Context){

    if(path)
      CONTEXT.set(path, this);

    if(!parent)
      return;

    this.define = Object.create(parent.define);
    this.macros = Object.create(parent.macros);
    this.module = parent.module;
  }

  get uid(): string {
    return simpleHash(this.parent?.uid);
  }

  get component(): FunctionContext | undefined {
    let ctx: Context | undefined = this;

    while(ctx = ctx.parent)
      if(ctx instanceof FunctionContext)
        return ctx;
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
}

export class ModuleContext extends Context {
  options: Options;

  constructor(
    public path: NodePath<Program>,
    state: any){

    const opts = state.opts as Options;
    const name = (path.hub as any).file.opts.filename as string;

    super(path);

    if(!opts.apply)
      throw new Error(`Plugin has not defined an apply method.`);

    Object.defineProperty(this, "uid", { value: name });

    this.module = this;
    this.macros = Object.assign({}, ...opts.macros || []);
    this.define = Object.assign({}, ...opts.define || []);
    this.options = {
      polyfill: require.resolve("../polyfill"),
      ...opts
    };
  }

  getHelper(name: string){
    const { polyfill } = this.options;
    const program = this.path
    const body = program.get("body");
  
    for(const statement of body){
      if(!statement.isImportDeclaration() || statement.node.source.value !== polyfill)
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

    super(path, parent);
  }

  get uid(): string {
    const uid = this.name + "_" + simpleHash(this.parent?.uid);
    Object.defineProperty(this, "uid", { value: uid });
    return uid;
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

      if(!body.isBlockStatement() || body.node.body.length > 0)
        return;
  
      body.replaceWith(t.blockStatement([
        t.returnStatement(
          t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier("this"), [], true),
            undefined, [], true
          )
        )
      ]));
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
    const from = this.path;
    let [props] = from.node.params;

    if (t.isObjectPattern(props)) {
      const { properties } = props;

      const prop = properties.find(x => (
        t.isObjectProperty(x) &&
        t.isIdentifier(x.key, { name })
      )) as ObjectProperty | undefined;

      if (prop)
        return prop.value as Identifier;

      const id = t.identifier(name);

      properties.unshift(t.objectProperty(id, id, false, true));

      return id;
    }
    else if (!props) {
      props = uniqueIdentifier(from.scope, "props");
      from.node.params.unshift(props);
    }

    if (t.isIdentifier(props))
      return t.memberExpression(props, t.identifier(name));

    throw new Error(`Expected an Identifier or ObjectPattern, got ${props.type}`);
  }

  getProps(){
    const { scope, node } = this.path;
    let [ props ] = node.params
    let output: Node | undefined;

    if(!props){
      node.params.push(output = uniqueIdentifier(scope, "props"));
    }
    else if(t.isObjectPattern(props)){
      const existing = props.properties.find(x => t.isRestElement(x));

      if(t.isRestElement(existing))
        output = existing.argument;

      const inserted = t.restElement(uniqueIdentifier(scope, "rest"));
      
      props.properties.push(inserted)

      output = inserted.argument;
    }
    else
      output = props;

    if(t.isIdentifier(output))
      return output;

    throw new Error("Could not extract props from function.")
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