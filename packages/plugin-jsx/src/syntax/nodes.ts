import type { Comment, Node, NodeType, Path, PathType, SourceLocation, Type } from './types';

export function assert(node: null | undefined, type: string, fields?: any): false;
export function assert<T extends Type>(path: Path<any> | undefined | null, type: T, fields?: Partial<NodeType<T>>): path is PathType<T>;
export function assert<T extends Type>(node: Node | undefined | null, type: T, fields?: Partial<NodeType<T>>): node is NodeType<T>;
export function assert<T extends Type, N extends NodeType<T>>(
  node: Node | Path<Node> | null | undefined, type: T, fields?: Partial<N>): boolean {

  if(!node || typeof node != "object")
    return false;

  if(node.type !== type)
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

interface BaseNode {
  leadingComments: ReadonlyArray<Comment> | null;
  innerComments: ReadonlyArray<Comment> | null;
  trailingComments: ReadonlyArray<Comment> | null;
  start: number | null;
  end: number | null;
  loc: SourceLocation | null;
  type: Node["type"];
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

export function create<T extends Type>(
  type: T, fields: Fields<NodeType<T>>){

  return { ...BASE_NODE, ...fields, type } as NodeType<T>;
}