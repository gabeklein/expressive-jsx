import { createElement as createJS } from './generate/es5';
import { createElement as createJSX } from './generate/jsx';

import * as t from 'syntax/types';
import type { Context } from 'context';
import type { Options, PropData } from 'types';
import * as $ from 'syntax';

type ImportSpecific =
  | t.ImportSpecifier 
  | t.ImportDefaultSpecifier 
  | t.ImportNamespaceSpecifier;

interface ElementReact {
  props: PropData[];
  children: t.Expression[];
}

interface External<T> {
  items: T[];
  exists?: boolean;
}

export abstract class FileManager {
  protected body: t.Statement[];
  protected scope: t.Scope;
  protected opts: Options;

  protected imports: Record<string, External<any>> = {};
  protected importIndices: Record<string, number> = {};

  static create(
    parent: Context,
    path: t.Path<t.BabelProgram>
  ){
    const { externals, output } = parent.options;
    const Type =
      externals == "require"
        ? RequireManager :
      externals == "import"
        ? ImportManager :
      output == "js"
        ? RequireManager
        : ImportManager;

    return new Type(path, parent);
  }

  constructor(
    path: t.Path<t.BabelProgram>,
    context: Context){

    const create = context.options.output === "js" ? createJS : createJSX;

    this.body = path.node.body;
    this.createElement = create.bind(this);
    this.opts = context.options;
    this.scope = path.scope;
  }

  abstract ensure(from: string, name: string, alt?: string): t.Identifier;
  abstract ensureImported(from: string): void;
  abstract createImport(name: string): t.Statement | undefined;

  private createElement: (
    tag: null | string | t.JSXMemberExpression,
    properties?: PropData[],
    content?: t.Expression[]
  ) => t.CallExpression | t.JSXElement;

  element(
    src: ElementReact,
    tagName?: string | t.JSXMemberExpression,
    collapsable?: boolean){

    const { children, props } = src;

    const tag = tagName || (
      props.length || !collapsable || !children.length ? "div" : null
    )

    if(!tag && children.length === 1)
      return children[0];

    return this.createElement(tag, props, children);
  }

  container(
    src: ElementReact,
    key?: t.Identifier){

    let { children } = src;

    if(src.props.length)
      children = [ this.element(src)! ];

    if(children.length > 1 || key){
      const props = key && [{ name: "key", value: key }];
      return this.createElement(null, props, children)
    }

    return children[0] || $.literal(false);
  }

  replaceAlias(value: string){
    if(!value.startsWith("$"))
      return value;

    const name = value.slice(1) as keyof Options;
    return this.opts[name] as string;
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
    if(this.opts.externals === false)
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

export class ImportManager extends FileManager {
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
      list.unshift($.importDefaultSpecifier(uid));
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
        $.importSpecifier(uid, t.identifier(name))
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
      return $.importDeclaration(list, $.literal(name));
  }
}

export class RequireManager extends FileManager {
  imports = {} as Record<string, External<t.ObjectProperty>>
  importTargets = {} as Record<string, t.Expression | false>

  ensure(from: string, name: string, alt = name){
    const source = this.ensureImported(from).items;

    for(const { key, value } of source)
      if(t.isIdentifier(value) && t.isIdentifier(key, { name }))
        return value;

    const ref = this.ensureUIDIdentifier(alt);

    source.push($.property(name, ref));

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
      const target = this.importTargets[name] || $.requires(name);
      return $.declare("const", t.objectPattern(list), target);
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