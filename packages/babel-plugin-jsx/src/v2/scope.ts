import { PluginPass } from '@babel/core';
import { getLocalFilename } from 'parse/entry';
import * as t from 'syntax';

import { Context } from './context';

import type { Options } from 'types';
import { Define } from './define';

type ImportSpecific =
  | t.ImportSpecifier 
  | t.ImportDefaultSpecifier 
  | t.ImportNamespaceSpecifier;

interface External<T> {
  items: T[];
  exists?: boolean;
}

const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/css",
  pragma: "react",
  output: "js",
  macros: []
};

export class FileContext extends Context {
  filename?: string;
  options: Options;

  constructor(path: t.Path<t.Program>, state: PluginPass){
    const opts = { ...DEFAULTS, ...state.opts };
    const name = getLocalFilename(path.hub);
    const file = File.create(opts, path);

    super(undefined, name);

    this.options = opts;
    this.file = file;
    this.filename = state.filename;
    Object.assign(this.macros, ...opts.macros);
  }
}

export abstract class File {
  declared = new Set<Define>();

  body: t.Statement[];
  scope: t.Scope;
  options: Options;

  imports: Record<string, External<any>> = {};
  importIndices: Record<string, number> = {};

  abstract ensure(from: string, name: string, alt?: string): t.Identifier;
  abstract ensureImported(from: string): void;
  abstract createImport(name: string): t.Statement | undefined;

  static create(
    options: Options,
    path: t.Path<t.Program>
  ){
    const { externals, output } = options;
    const Type =
      externals == "require" ? RequireManager :
      externals == "import" ? ImportManager :
      output == "js"
        ? RequireManager
        : ImportManager;

    return new Type(path, options);
  }

  constructor(
    path: t.Path<t.Program>,
    options: Options){

    this.body = path.node.body;
    this.options = options;
    this.scope = path.scope;
  }

  replaceAlias(value: string){
    if(!value.startsWith("$"))
      return value;

    const name = value.slice(1) as keyof Options;
    return this.options[name] as string;
  }

  ensureUID(name = "temp"){
    const { scope } = this;

    let uid = name = name
      .replace(/^_+/, "")
      .replace(/[0-9]+$/g, "");

    for(let i = 2;
      scope.hasBinding(uid) ||
      scope.hasGlobal(uid) ||
      scope.hasReference(uid);
      i++
    ){
      uid = name + i;
    }

    const program = scope.getProgramParent() as any;
    program.references[uid] = true;
    program.uids[uid] = true;
    return uid;
  }

  ensureUIDIdentifier(name: string){
    return t.identifier(this.ensureUID(name));
  }

  close(){
    if(this.options.externals === false)
      return;

    Object.entries(this.imports).forEach(([name, external]) => {
      if(external.exists)
        return;
      
      const importStatement = this.createImport(name);

      if(importStatement){
        const index = this.importIndices[name];
        
        this.body.splice(index, 0, importStatement);
      }
    })
  }
}

export class ImportManager extends File {
  imports = {} as Record<string, External<ImportSpecific>>

  ensure(from: string, name: string, alt = name){
    from = this.replaceAlias(from);

    let uid;
    const list = this.ensureImported(from).items;

    if(name == "default"){
      const [ spec ] = list;

      if(t.isImportDefaultSpecifier(spec))
        return spec.local;

      uid = this.ensureUIDIdentifier(alt);
      list.unshift(t.importDefaultSpecifier(uid));
      return uid;
    }

    for(const spec of list)
      if("imported" in spec){
        const { imported } = spec;

        if(imported.type == "Identifier" && imported.name == name){
          uid = t.identifier(spec.local.name);
          break;
        }
      }

    if(!uid){
      uid = this.ensureUIDIdentifier(alt || name);
      list.push(
        t.importSpecifier(uid, t.identifier(name))
      )
    }

    return uid;
  }

  ensureImported(name: string){
    const { imports } = this;

    name = this.replaceAlias(name);

    if(imports[name])
      return imports[name];

    for(const stat of this.body)
      if(t.isImportDeclaration(stat) && stat.source.value == name)
        return imports[name] = {
          exists: true,
          items: stat.specifiers
        };

    return imports[name] = {
      exists: false,
      items: []
    };
  }

  createImport(name: string){
    const list = this.imports[name].items;

    if(list.length)
      return t.importDeclaration(list, t.literal(name));
  }
}

export class RequireManager extends File {
  imports = {} as Record<string, External<t.ObjectProperty>>
  importTargets = {} as Record<string, t.Expression | false>

  ensure(from: string, name: string, alt = name){
    const source = this.ensureImported(from).items;

    for(const { key, value } of source)
      if(t.isIdentifier(value) && t.isIdentifier(key, { name }))
        return value;

    const ref = this.ensureUIDIdentifier(alt);

    source.push(t.property(name, ref));

    return ref;
  }

  ensureImported(name: string){
    const { body, imports, importTargets } = this;
    
    name = this.replaceAlias(name);

    if(name in imports)
      return imports[name];

    let target;
    let list;

    for(let i = 0, stat; stat = body[i]; i++)
      if(t.isVariableDeclaration(stat))
        target = requireResultFrom(name, stat);

    if(t.isObjectPattern(target))
      list = imports[name] = {
        exists: true,
        items: target.properties as t.ObjectProperty[]
      }
    else {
      list = imports[name] = { items: [] };

      if(target && target.type === "Identifier")
        importTargets[name] = target;
    }

    return list;
  }

  createImport(name: string){
    const list = this.imports[name].items;

    if(list.length){
      const target = this.importTargets[name] || t.requires(name);
      return t.declare("const", t.objectPattern(list), target);
    }
  }
}

function requireResultFrom(
  name: string,
  statement: t.VariableDeclaration){

  for(const { init, id } of statement.declarations)
    if(t.isCallExpression(init)){
      const { callee, arguments: [ arg ] } = init;

      if(t.isIdentifier(callee, { name: "require" }) 
      && t.isStringLiteral(arg, { value: name }))
        return id;
    } 
}