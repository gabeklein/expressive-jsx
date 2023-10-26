import type { Comment, Node,SourceLocation } from '@babel/types';

import type { NodePath as Path } from "@babel/traverse";
import type * as t from "@babel/types";

export type { Scope, VisitNodeObject } from '@babel/traverse';

type Type = t.Node["type"];
type NodeType<T extends Type, N = t.Node> = N extends { type: T } ? N : never;
type PathType<T extends Type> = Path<NodeType<T>>;

function is(
  node: null | undefined,
  type: string | string[],
  fields?: any
): false;

function is<T extends Type>(
  path: Path<any> | undefined | null,
  type: T | T[],
  fields?: Partial<NodeType<T>>
): path is PathType<T>;

function is<T extends Type>(
  node: Node | undefined | null,
  type: T | T[],
  fields?: Partial<NodeType<T>>
): node is NodeType<T>;

function is<T extends Type, N extends NodeType<T>>(
  node: Node | Path<Node> | null | undefined,
  expect: T | T[],
  fields?: Partial<N>): boolean {

  if(!node || typeof node != "object")
    return false;

  const nodeType = node.type;

  if(expect instanceof Array){
    if(!expect.some(e => e === nodeType))
      return false;
  }
  else if(expect !== nodeType)
    return false;

  if("node" in node)
    node = node.node;
      
  if(fields)
    for(const k in fields){
      const expect = fields[k] as any;
      const value = (node as any)[k];

      if(expect !== value)
        return false;
    }
    
  return true;
}

export { is }

interface BaseNode {
  leadingComments: ReadonlyArray<Comment> | null;
  innerComments: ReadonlyArray<Comment> | null;
  trailingComments: ReadonlyArray<Comment> | null;
  start: number | null;
  end: number | null;
  loc: SourceLocation | null;
  type: Node["type"];
  extra: Record<string, unknown>;
  range: [number, number];
}

const BASE_NODE = {
  leadingComments: null,
  innerComments: null,
  trailingComments: null,
  start: null,
  end: null,
  loc: null
}

type Fields<T extends Node> = 
  & { [P in Exclude<keyof T, keyof BaseNode>]: T[P] }
  & Partial<BaseNode>

export function node<T extends Type>(
  type: T, fields?: Fields<NodeType<T>>){

  return { ...BASE_NODE, ...fields, type } as NodeType<T>;
}