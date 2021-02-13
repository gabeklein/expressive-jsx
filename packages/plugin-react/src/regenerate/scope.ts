import { NodePath as Path, Scope } from '@babel/traverse';
import {
  Expression,
  Identifier,
  identifier,
  importDeclaration,
  ImportDefaultSpecifier,
  importDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  importSpecifier,
  isCallExpression,
  isIdentifier,
  isImportDeclaration,
  isImportDefaultSpecifier,
  isObjectPattern,
  isStringLiteral,
  isVariableDeclaration,
  objectPattern,
  ObjectProperty,
  objectProperty,
  Program,
  Statement,
  stringLiteral,
} from '@babel/types';
import { _declare, _require } from 'syntax';
import { BunchOf, Options } from 'types';

type ImportSpecific =
  | ImportSpecifier 
  | ImportDefaultSpecifier 
  | ImportNamespaceSpecifier;

export function ensureUIDIdentifier(
  scope: Scope,
  name: string = "temp"){

  return identifier(ensureUID(scope, name))
}

export function ensureUID(
  scope: Scope,
  name: string = "temp"){

  name = name
    .replace(/^_+/, "")
    .replace(/[0-9]+$/g, "");

  let uid = name;
  let i = 2;

  while(
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid) ||
    scope.hasReference(uid))
    uid = name + i++;

  const program = scope.getProgramParent() as any;
  program.references[uid] = program.uids[uid] = true;
  return uid;
}

export abstract class ExternalsManager {
  body: Statement[];
  scope: Scope;

  imports = {} as BunchOf<(ObjectProperty | ImportSpecific)[]>
  importIndices = {} as BunchOf<number>;

  constructor(
    path: Path<Program>,
    private opts: Options){

    this.body = path.node.body;
    this.scope = path.scope;
  }

  abstract ensure(from: string, name: string, alt?: string): Identifier;
  abstract ensureImported(from: string, after?: number): void;
  abstract createImport(name: string): Statement | undefined;

  replaceAlias(value: string){
    if(value[0] !== "$")
      return value;

    const name = value.slice(1) as keyof Options;
    return this.opts[name] as string;
  }

  EOF(){
    const requireOccuring = Object
      .entries(this.importIndices)
      .sort((a, b) => a[1] - b[1])

    for(const [ name ] of requireOccuring){
      const importStatement = this.createImport(name);

      if(importStatement){
        const index = this.importIndices[name];
        this.body.splice(index, 0, importStatement);
      }
    }
  }
}

export class ImportManager extends ExternalsManager {
  imports = {} as BunchOf<ImportSpecific[]>

  ensure(from: string, name: string, alt?: string){
    from = this.replaceAlias(from);

    let uid;
    const list = this.imports[from] || this.ensureImported(from);

    if(name == "default"){
      if(isImportDefaultSpecifier(list[0]))
        return list[0].local;
      else {
        uid = ensureUIDIdentifier(this.scope, alt || from);
        list.unshift(importDefaultSpecifier(uid));
        return uid
      }
    }

    for(const spec of list)
      if("imported" in spec && isIdentifier(spec.imported, { name })){
        uid = identifier(spec.local.name);
        break;
      }

    if(!uid){
      uid = ensureUIDIdentifier(this.scope, alt || name);
      list.push(
        importSpecifier(uid, identifier(name))
      )
    }

    return uid;
  }

  ensureImported(from: string, after = 0){
    const { imports, importIndices, body } = this;

    for(const stat of body)
      if(isImportDeclaration(stat)
      && stat.source.value == from)
        return imports[from] = stat.specifiers

    importIndices[from] = after;
    return imports[from] = [];
  }

  createImport(name: string){
    const list = this.imports[name];

    if(list.length)
      return importDeclaration(list, stringLiteral(name));
  }
}

export class RequireManager extends ExternalsManager {
  imports = {} as BunchOf<ObjectProperty[]>
  importTargets = {} as BunchOf<Expression | false>

  ensure(from: string, name: string, alt = name){
    const source = this.ensureImported(from);

    for(const { key, value } of source)
      if(isIdentifier(key, { name }) && isIdentifier(value))
        return value;

    const ref = ensureUIDIdentifier(this.scope, alt);
    const key = identifier(name);
    const useShorthand = ref.name === name;
    const property = objectProperty(key, ref, false, useShorthand);

    source.push(property)

    return ref;
  }

  ensureImported(from: string){
    const { body, imports, importIndices, importTargets } = this;
    
    from = this.replaceAlias(from);

    if(from in imports)
      return imports[from];

    let target;
    let insertableAt;
    let list;

    for(let i = 0, stat; stat = body[i]; i++)
      if(isVariableDeclaration(stat))
        for(const { init, id } of stat.declarations)
          if(isCallExpression(init)
          && isIdentifier(init.callee, { name: "require" })
          && isStringLiteral(init.arguments[0], { value: from })){
            target = id;
            insertableAt = i + 1;
          }

    if(isObjectPattern(target))
      list = imports[from] = target.properties as ObjectProperty[];
    else {
      list = imports[from] = [];
      importIndices[from] = insertableAt || 0;
      importTargets[from] = isIdentifier(target) && target;
    }

    return list;
  }

  createImport(name: string){
    const list = this.imports[name]

    if(list.length){
      const target = this.importTargets[name] || _require(name);
      return _declare("const", objectPattern(list), target);
    }
  }
}