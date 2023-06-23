import type * as t from 'syntax/types';
import type { RootContext } from './context';
import type { Options } from 'types';
import * as $ from 'syntax';

type ImportSpecific =
  | t.ImportSpecifier 
  | t.ImportDefaultSpecifier 
  | t.ImportNamespaceSpecifier;

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
    parent: RootContext,
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
    context: RootContext){

    this.body = path.node.body;
    this.opts = context.options;
    this.scope = path.scope;
  }

  abstract ensure(from: string, name: string, alt?: string): t.Identifier;
  abstract ensureImported(from: string): void;
  abstract createImport(name: string): t.Statement | undefined;

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
    return $.identifier(this.ensureUID(name));
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

      if($.is(spec, "ImportDefaultSpecifier"))
        return spec.local;

      uid = this.ensureUIDIdentifier(alt);
      list.unshift($.importDefaultSpecifier(uid));
      return uid;
    }

    for(const spec of list)
      if("imported" in spec){
        const { imported } = spec;

        if(imported.type == "Identifier" && imported.name == name){
          uid = $.identifier(spec.local.name);
          break;
        }
      }

    if(!uid){
      uid = this.ensureUIDIdentifier(alt || name);
      list.push(
        $.importSpecifier(uid, $.identifier(name))
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
      if($.is(stat, "ImportDeclaration") && stat.source.value == name)
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
      if($.is(value, "Identifier")
      && $.is(key, "Identifier", { name }))
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
      if($.is(stat, "VariableDeclaration"))
        target = requireResultFrom(name, stat);

    if($.is(target, "ObjectPattern"))
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
      return $.declare("const", $.pattern(list), target);
    }
  }
}

function requireResultFrom(
  name: string,
  statement: t.VariableDeclaration){

  for(const { init, id } of statement.declarations)
    if($.is(init, "CallExpression")){
      const { callee, arguments: [ arg ] } = init;

      if($.is(callee, "Identifier", { name: "require" })
      && $.is(arg, "StringLiteral", { value: name }))
        return id;
    } 
}