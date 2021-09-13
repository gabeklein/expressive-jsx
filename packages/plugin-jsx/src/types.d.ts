import type { StackFrame } from 'context';
import type { ExplicitStyle, Prop } from 'handle/attributes';
import type { ModifyDelegate } from 'parse/modifiers';
import type { ElementInline } from 'handle/element';
import type { ComponentFor } from 'handle/iterate';
import type { ComponentIf } from 'handle/switch';
import type * as t from 'syntax/types';

export interface BunchOf<T> {
  [key: string]: T
}

export interface BabelFile extends File {
  buildCodeFrameError<TError extends Error>(
    node: t.Node,
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
  value: t.Expression
}

export type FlatValue =
  | string
  | number
  | boolean
  | null;

export type SequenceItem =
  | ExplicitStyle
  | Prop
  | InnerContent
  | t.Statement;

export type InnerContent =
  | t.Expression
  | ElementInline
  | ComponentIf
  | ComponentFor;

interface ModifierOutput {
  attrs?: BunchOf<any>
  style?: BunchOf<any>
  props?: BunchOf<any>
}

export type ModifyAction =
  (this: ModifyDelegate, ...args: any[]) => ModifierOutput | void;

export type DefineBodyCompat =
  | t.Path<t.ExpressionStatement>
  | t.Path<t.BlockStatement>
  | t.Path<t.LabeledStatement>
  | t.Path<t.IfStatement>;