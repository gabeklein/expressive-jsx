import { PluginPass } from '@babel/core';
import { getLocalFilename } from 'parse/entry';
import * as t from 'syntax';
import { Options } from 'types';
import { hash } from 'utility';

import { Context } from './context';
import { DefineContext } from './define';
import { generateCSS, styleDeclaration } from './styles';

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
  root = this;
  filename?: string;
  options: Options;
  body: t.Statement[];
  scope: t.Scope;

  declared = new Set<DefineContext>();
  importIndices: Record<string, number> = {};
  imports = {} as Record<string, External<ImportSpecific>>

  constructor(path: t.Path<t.Program>, state: PluginPass){
    const opts = { ...DEFAULTS, ...state.opts };
    const name = getLocalFilename(path.hub);

    super(undefined, name);

    path.data = { context: this };

    this.options = opts;
    this.body = path.node.body;
    this.scope = path.scope;
    this.filename = state.filename;
    Object.assign(this.macros, ...opts.macros);
  }

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

  runtimeStyle(){
    const { root: file, filename, options } = this;
    const token = options.hot !== false && hash(filename, 10);
    const stylesheet = generateCSS(file.declared);

    if(stylesheet)
      return styleDeclaration(stylesheet, file, token)
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