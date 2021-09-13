import type * as r from "@babel/traverse";
import type * as t from "@babel/types";

type Type = t.Node["type"];
type Node<T extends Type> = t.Node & { type: T };
type Path<T extends Type> = r.NodePath<t.Node & { type: T }>;

export function assert(node: null | undefined, type: string, fields?: any): false;
export function assert<T extends Type>(path: r.NodePath<any> | undefined | null, type: T, fields?: Partial<Node<T>>): path is Path<T>;
export function assert<T extends Type>(node: t.Node | undefined | null, type: T, fields?: Partial<Node<T>>): node is Node<T>;
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

interface BaseNode {
  leadingComments: ReadonlyArray<t.Comment> | null;
  innerComments: ReadonlyArray<t.Comment> | null;
  trailingComments: ReadonlyArray<t.Comment> | null;
  start: number | null;
  end: number | null;
  loc: t.SourceLocation | null;
  type: t.Node["type"];
}

const BASE_NODE = {
  leadingComments: null,
  innerComments: null,
  trailingComments: null,
  start: null,
  end: null,
  loc: null
}

type Fields<T extends t.Node> = 
  & { [P in Exclude<keyof T, keyof BaseNode>]: T[P] }
  & Partial<BaseNode>

export function create<T extends Type>(
  type: T, fields: Fields<Node<T>>){

  return { ...BASE_NODE, ...fields, type } as Node<T>;
}