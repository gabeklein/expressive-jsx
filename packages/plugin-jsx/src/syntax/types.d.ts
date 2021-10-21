import type * as r from "@babel/traverse";
import type * as t from "@babel/types";

export type { NodePath as Path, Scope, VisitNodeObject } from '@babel/traverse';
export type { Program as BabelProgram } from '@babel/types';
export * from '@babel/types';

export type Type = t.Node["type"];
export type NodeType<T extends Type, N = t.Node> = N extends { type: T } ? N : never;
export type PathType<T extends Type> = r.NodePath<NodeType<T>>;