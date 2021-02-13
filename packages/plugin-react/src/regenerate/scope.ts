import { NodePath as Path } from '@babel/traverse';
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
  JSXIdentifier,
  jsxIdentifier,
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

export abstract class ExternalsManager {
  protected body: Statement[];

  protected imports = {} as BunchOf<(ObjectProperty | ImportSpecific)[]>
  protected importIndices = {} as BunchOf<number>;

  constructor(
    private path: Path<Program>,
    protected opts: Options){

    this.body = path.node.body;
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

  ensureUID(name = "temp"){
    const { scope } = this.path;

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
    program.references[uid] = program.uids[uid] = true;
    return uid;
  }

  ensureUIDIdentifier(name: string, jsx?: false): Identifier;
  ensureUIDIdentifier(name: string, jsx: true): JSXIdentifier;
  ensureUIDIdentifier(name: string, jsx = false){
    const ref = this.ensureUID(name);
    return jsx ? jsxIdentifier(ref) :  identifier(ref);
  }

  EOF(){
    Object
      .entries(this.importIndices)
      .sort((a, b) => a[1] - b[1])
      .forEach(([ name ]) => {
        const importStatement = this.createImport(name);
  
        if(importStatement){
          const index = this.importIndices[name];
          this.body.splice(index, 0, importStatement);
        }
      })
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
        uid = this.ensureUIDIdentifier(alt || from);
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
      uid = this.ensureUIDIdentifier(alt || name);
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

    const ref = this.ensureUIDIdentifier(alt);
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