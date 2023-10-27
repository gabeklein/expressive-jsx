import { t } from 'syntax';
import { ensureUID } from 'syntax/uid';

import { createElement as createJS } from './generate/es5';
import { createElement as createJSX } from './generate/jsx';

import type { Options } from 'index';
import type * as $ from 'types';

type ImportSpecific =
  | $.ImportSpecifier 
  | $.ImportDefaultSpecifier 
  | $.ImportNamespaceSpecifier;

interface ElementReact {
  props: $.PropData[];
  children: $.Expression[];
}

interface External<T> {
  items: T[];
  exists?: boolean;
}

export abstract class FileManager {
  protected options: Options;

  protected imports: Record<string, External<any>> = {};
  protected importIndices: Record<string, number> = {};

  static create(
    options: Options,
    path: $.Path<$.Program>
  ){
    const { externals, output } = options;
    const Type =
      externals == "require"
        ? RequireManager :
      externals == "import"
        ? ImportManager :
      output == "js"
        ? RequireManager
        : ImportManager;

    return new Type(path, options);
  }

  constructor(
    protected path: $.Path<$.Program>,
    options: Options){

    this.options = options;
    this.createElement = options.output === "js"
      ? createJS
      : createJSX;
  }

  abstract ensure(from: string, name: string, alt?: string | $.Identifier): $.Identifier;
  abstract ensureImported(from: string): void;
  abstract createImport(name: string): $.Statement | undefined;

  private createElement: (
    tag: null | string | $.JSXMemberExpression,
    properties?: $.PropData[],
    content?: $.Expression[]
  ) => $.CallExpression | $.JSXElement;

  element(
    src: ElementReact,
    tagName?: string | $.JSXMemberExpression,
    collapsable?: boolean){

    const { children, props } = src;

    const tag = tagName || (
      props.length ||
      !collapsable ||
      !children.length ? "div" : null
    )

    if(!tag && children.length === 1)
      return children[0];

    return this.createElement(tag, props, children);
  }

  container(
    src: ElementReact,
    key?: $.Identifier){

    let { children } = src;

    if(src.props.length)
      children = [ this.element(src)! ];

    if(children.length > 1 || key){
      const props = key && [{ name: "key", value: key }];
      return this.createElement(null, props, children)
    }

    return children[0] || t.literal(false);
  }

  replaceAlias(value: string){
    if(!value.startsWith("$"))
      return value;

    const name = value.slice(1) as keyof Options;
    return this.options[name] as string;
  }

  ensureUIDIdentifier(name: string){
    return t.identifier(ensureUID(this.path, name));
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
        
        this.path.node.body.splice(index, 0, importStatement);
      }
    })
  }
}

export class ImportManager extends FileManager {
  imports = {} as Record<string, External<ImportSpecific>>

  ensure(from: string, name: string, alt: $.Identifier | string = name){
    from = this.replaceAlias(from);

    let uid;
    const list = this.ensureImported(from).items;

    if(name == "default"){
      const [ spec ] = list;

      if(t.isImportDefaultSpecifier(spec))
        return spec.local;

      uid = typeof alt == "string" ? this.ensureUIDIdentifier(alt) : alt;
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
      uid = typeof alt == "object" ? alt : this.ensureUIDIdentifier(alt || name);
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

    for(const stat of this.path.node.body)
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

export class RequireManager extends FileManager {
  imports = {} as Record<string, External<$.ObjectProperty>>
  importTargets = {} as Record<string, $.Expression | false>

  ensure(from: string, name: string, alt = name){
    const source = this.ensureImported(from).items;

    for(const { key, value } of source)
      if(t.isIdentifier(value) && t.isIdentifier(key, { name }))
        return value;

    const ref = typeof alt == "string" ? this.ensureUIDIdentifier(alt) : alt;

    source.push(t.property(name, ref));

    return ref;
  }

  ensureImported(name: string){
    const { imports, importTargets } = this;
    
    name = this.replaceAlias(name);

    if(name in imports)
      return imports[name];

    let target;
    let list;

    for(let i = 0, stat; stat = this.path.node.body[i]; i++)
      if(t.isVariableDeclaration(stat))
        target = requireResultFrom(name, stat);

    if(t.isObjectPattern(target))
      list = imports[name] = {
        exists: true,
        items: target.properties as $.ObjectProperty[]
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
  statement: $.VariableDeclaration){

  for(const { init, id } of statement.declarations)
    if(t.isCallExpression(init)){
      const { callee, arguments: [ arg ] } = init;

      if(t.isIdentifier(callee, { name: "require" })
      && t.isStringLiteral(arg, { value: name }))
        return id;
    } 
}