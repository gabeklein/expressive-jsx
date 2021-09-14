import type * as r from "@babel/traverse";
import type * as t from "@babel/types";

export type { NodePath as Path, Scope, VisitNodeObject } from '@babel/traverse';
export type { Program as BabelProgram } from '@babel/types';
export * from '@babel/types';

export type Type = t.Node["type"];
export type NodeType<T extends Type> = t.Node & { type: T };
export type PathType<T extends Type> = r.NodePath<t.Node & { type: T }>;