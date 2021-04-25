import type { NodePath as Path } from '@babel/traverse';
import type {
  BlockStatement,
  Expression,
  ExpressionStatement,
  File,
  IfStatement,
  LabeledStatement,
  Node,
  Statement,
} from '@babel/types';

import type { StackFrame } from 'context';
import type { Attribute } from 'handle/attributes';
import type { ModifyDelegate } from 'parse/modifiers';
import type { ElementInline } from 'handle/element';
import type { ComponentFor, ComponentForX } from 'handle/iterate';
import type { ComponentIf } from 'handle/switch';

export interface BunchOf<T> {
  [key: string]: T
}

export interface BabelFile extends File {
  buildCodeFrameError<TError extends Error>(
    node: Node,
    msg: string,
    Error?: new (msg: string) => TError
  ): TError;
}

export interface Options {
  // expected
  env: "native" | "web";
  output: "js" | "jsx";
  pragma: "react";
  runtime: string;
  styleMode: "compile" | "inline" | "verbose";
  modifiers: BunchOf<(...args: any[]) => any>[];

  // optional
  hot?: boolean;
  printStyle?: "pretty";
  externals?: "require" | "import" | false;
}

export interface BabelState<S extends StackFrame = StackFrame> {
  file: File;
  filename: string;
  cwd: string;
  context: S;
  opts: Options;
}

export interface PropData {
  name: string | false | undefined
  value: Expression
}

export type FlatValue =
  | string
  | number
  | boolean
  | null;

export type SequenceItem =
  | Attribute
  | InnerContent
  | Statement;

export type InnerContent =
  | Expression
  | ElementInline
  | ComponentIf
  | ComponentFor
  | ComponentForX;

interface ModifierOutput {
  attrs?: BunchOf<any>
  style?: BunchOf<any>
  props?: BunchOf<any>
}

export type ModifyAction =
  (this: ModifyDelegate, ...args: any[]) => ModifierOutput | void;

export type DefineCompatibleBody =
  | Path<ExpressionStatement>
  | Path<BlockStatement>
  | Path<LabeledStatement>
  | Path<IfStatement>;