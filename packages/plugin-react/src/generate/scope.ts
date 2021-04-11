import {
  booleanLiteral,
  identifier,
  importDeclaration,
  importDefaultSpecifier,
  importSpecifier,
  isCallExpression,
  isIdentifier,
  isImportDeclaration,
  isImportDefaultSpecifier,
  isObjectPattern,
  isStringLiteral,
  isVariableDeclaration,
  objectPattern,
  objectProperty,
  stringLiteral,
} from '@babel/types';
import { _declare, _require } from 'syntax';

import { createElement as createJS } from './es5';
import { createElement as createJSX } from './jsx';

import type { NodePath as Path } from '@babel/traverse';
import type {
  CallExpression,
  Expression,
  Identifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  JSXElement,
  JSXMemberExpression,
  ObjectProperty,
  Program,
  Statement,
  VariableDeclaration
} from '@babel/types';
import type { StackFrame } from 'context';
import type { BunchOf, Options, PropData } from 'types';

type ImportSpecific =
  | ImportSpecifier 
  | ImportDefaultSpecifier 
  | ImportNamespaceSpecifier;

interface ElementReact {
  props: PropData[];
  children: Expression[];
}

export abstract class FileManager {
  protected body: Statement[];

  protected imports = {} as BunchOf<(ObjectProperty | ImportSpecific)[]>
  protected importIndices = {} as BunchOf<number>;

  constructor(
    private path: Path<Program>,
    protected context: StackFrame){

    const create = context.opts.output === "js" ? createJS : createJSX;

    this.createElement = create.bind(context);
    this.body = path.node.body;
  }

  abstract ensure(from: string, name: string, alt?: string): Identifier;
  abstract ensureImported(from: string): void;
  abstract createImport(name: string): Statement | undefined;

  private createElement: (
    tag: null | string | JSXMemberExpression,
    properties?: PropData[],
    content?: Expression[]
  ) => CallExpression | JSXElement;

  element(
    src: ElementReact,
    tagName?: string | JSXMemberExpression){

    const tag = tagName || "div";
    return this.createElement(tag, src.props, src.children);
  }

  fragment(
    children = [] as Expression[],
    key?: Expression){

    const props = key && [{ name: "key", value: key }];
    return this.createElement(null, props, children)
  }

  container(
    src: ElementReact,
    key?: Identifier
  ): Expression {

    let output: Expression | undefined;

    if(src.props.length == 0){
      const { children } = src;

      if(children.length == 0)
        return booleanLiteral(false);

      if(children.length > 1)
        return this.fragment(children, key);

      output = children[0];
    }

    if(!output)
      output = this.element(src)

    if(key)
      return this.fragment([ output ], key)
    else
      return output
  }

  replaceAlias(value: string){
    if(value[0] !== "$")
      return value;

    const name = value.slice(1) as keyof Options;
    return this.context.opts[name] as string;
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

  ensureUIDIdentifier(name: string){
    return identifier(this.ensureUID(name));
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

export class ImportManager extends FileManager {
  imports = {} as BunchOf<ImportSpecific[]>

  ensure(from: string, name: string, alt = name){
    from = this.replaceAlias(from);

    let uid;
    const list = this.imports[from] || this.ensureImported(from);

    if(name == "default"){
      if(isImportDefaultSpecifier(list[0]))
        return list[0].local;
      else {
        uid = this.ensureUIDIdentifier(alt);
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

  ensureImported(name: string){
    const { imports, body } = this;

    name = this.replaceAlias(name);

    for(const stat of body)
      if(isImportDeclaration(stat) && stat.source.value == name)
        return imports[name] = stat.specifiers;

    return imports[name] = [];
  }

  createImport(name: string){
    const list = this.imports[name];

    if(list.length)
      return importDeclaration(list, stringLiteral(name));
  }
}

export class RequireManager extends FileManager {
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

  ensureImported(name: string){
    const { body, imports, importTargets } = this;
    
    name = this.replaceAlias(name);

    if(name in imports)
      return imports[name];

    let target;
    let list;

    for(let i = 0, stat; stat = body[i]; i++)
      if(isVariableDeclaration(stat))
        target = requireResultFrom(name, stat);

    if(target && isObjectPattern(target))
      list = imports[name] = target.properties as ObjectProperty[];
    else {
      list = imports[name] = [];

      if(isIdentifier(target))
        importTargets[name] = target;
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

function requireResultFrom(
  name: string,
  statement: VariableDeclaration){

  for(const { init, id } of statement.declarations)
    if(isCallExpression(init)
    && isIdentifier(init.callee, { name: "require" })
    && isStringLiteral(init.arguments[0], { value: name }))
      return id;
}