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
import { Shared } from 'shared';
import { _declare, _require } from 'syntax';
import { BunchOf } from 'types';

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

  name = name.replace(/^_+/, "").replace(/[0-9]+$/g, "");
  let uid;
  let i = 0;

  do {
    uid = name + (i > 1 ? i : "");
    i++;
  }
  while (
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid) ||
    scope.hasReference(uid)
  );

  const program = scope.getProgramParent() as any;
  program.references[uid] = true;
  program.uids[uid] = true;
  return uid;
}

export interface ExternalsManager {
  opts?: any;

  ensure(from: string, name: string, alt?: string): Identifier;
  ensureImported(from: string, after?: number): void;

  EOF(): void;
}

export class ImportManager implements ExternalsManager {
  imports = {} as BunchOf<ImportSpecific[]>
  importIndices = {} as BunchOf<number>
  body: Statement[];
  scope: Scope;

  constructor(path: Path<Program>){
    this.body = path.node.body;
    this.scope = path.scope;
  }

  ensure(
    from: string,
    name: string,
    alt?: string){

    from = Shared.replaceAlias(from);

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

  ensureImported(
    from: string,
    after?: number){

    for(const statement of this.body)
      if(statement.type == "ImportDeclaration"
      && statement.source.value == from)
        return this.imports[from] = statement.specifiers

    this.importIndices[from] = after || 0;
    return this.imports[from] = [];
  }

  EOF(){
    const requireOccuring = Object
      .entries(this.importIndices)
      .sort((a,b) => a[1] - b[1])
      .map(x => x[0]);

    for(const name of requireOccuring){
      const list = this.imports[name];
      const index = this.importIndices[name];

      if(list.length == 0)
        continue

      this.body.splice(index, 0,
        importDeclaration(list, stringLiteral(name))
      )
    }
  }
}

export class RequireManager implements ExternalsManager {
  imports = {} as BunchOf<ObjectProperty[]>
  importTargets = {} as BunchOf<Expression | false>
  importIndices = {} as BunchOf<number>
  body: Statement[];
  scope: Scope;

  constructor(path: Path<Program>){
    this.body = path.node.body;
    this.scope = path.scope;
  }

  ensure(
    from: string,
    name: string,
    alt?: string){

    from = Shared.replaceAlias(from);

    const source = this.imports[from] || this.ensureImported(from);

    if(!alt)
      for(const { key, value } of source)
        if(isIdentifier(key, { name }) && isIdentifier(value))
          return value;

    const uid = ensureUID(this.scope, alt || name);
    const ref = identifier(uid);
    const key = identifier(name);
    const useShorthand = uid === name;
    const property = objectProperty(key, ref, false, useShorthand);

    source.push(property)

    return ref;
  }

  ensureImported(from: string, after?: number){
    let target;
    let insertableAt;
    let list;

    for(let i = 0, stat; stat = this.body[i]; i++)
      if(isVariableDeclaration(stat))
        for(const { init, id } of stat.declarations)
          if(isCallExpression(init)
          && isIdentifier(init.callee, { name: "require" })
          && isStringLiteral(init.arguments[0], { value: from })){
            target = id;
            insertableAt = i + 1;
          }

    if(isObjectPattern(target))
      list = this.imports[from] = target.properties as ObjectProperty[];
    else {
      list = this.imports[from] = [];
      this.importIndices[from] = insertableAt || 0;
      this.importTargets[from] = isIdentifier(target) && target;
    }

    return list;
  }

  EOF(){
    const requireOccuring = Object
      .entries(this.importIndices)
      .sort((a,b) => a[1] - b[1])
      .map(x => x[0]);

    for(const name of requireOccuring){
      const list = this.imports[name]
  
      if(list.length == 0)
        continue;

      const index = this.importIndices[name];
      const target = this.importTargets[name] || _require(name);

      this.body.splice(index, 0, 
        _declare("const", objectPattern(list), target)
      )
    }
  }
}