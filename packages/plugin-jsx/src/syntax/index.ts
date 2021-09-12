export {
  importDeclaration,
  importSpecifier,
  importDefaultSpecifier
} from '@babel/types';

export * from './assertion';
export * from './construct';
export * from './jsx';

import type * as r from "@babel/traverse";
import type * as t from "@babel/types";

type Type = t.Node["type"];
type Node<T extends Type> = t.Node & { type: T };
type Path<T extends Type> = r.NodePath<t.Node & { type: T }>;

export function assert<T extends Type>(path: r.NodePath<any>, type: T, fields?: Partial<Node<T>>): path is Path<T>;
export function assert<T extends Type>(node: t.Node, type: T, fields?: Partial<Node<T>>): node is Node<T>;
export function assert(node: null | undefined, type: string, fields?: any): false;
export function assert<T extends Type, N extends Node<T>>(
  node: t.Node | r.NodePath<t.Node> | null | undefined, type: T, fields?: Partial<N>): boolean {

  if(!node || typeof node != "object")
    return false;

  if("node" in node)
    node = node.node;

  if(type !== node.type)
      return false;
      
  if(fields)
    for(const k in fields){
      const expect = fields[k] as any;
      const value = (node as any)[k];

      if(expect !== value)
        return false;
    }
    
  return true;
}