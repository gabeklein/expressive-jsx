import type { Context } from 'context';
import type { Style, Prop } from 'handle/attributes';
import type { ModifyDelegate } from 'parse/labels';
import type { ElementInline } from 'handle/definition';
import type { ComponentFor } from 'handle/iterate';
import type { ComponentIf } from 'handle/switch';
import type * as t from 'syntax/types';

type Visitor<T extends t.Node, S extends Context = Context> =
  t.VisitNodeObject<BabelState<S>, T>;

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
  styleMode: "compile" | "inline";
  macros: Record<string, (...args: any[]) => any>[];
  module?: true | string;

  // optional
  hot?: boolean;
  printStyle?: "pretty";
  externals?: "require" | "import" | false;
}

export interface BabelState<S extends Context = Context> {
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
  | Style
  | Prop
  | InnerContent
  | t.Statement;

export type InnerContent =
  | t.Expression
  | ElementInline
  | ComponentIf
  | ComponentFor;