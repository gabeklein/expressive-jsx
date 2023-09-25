import * as t from 'syntax';

import type { Style, Prop } from 'handle/attributes';
import type { ElementInline } from 'handle/definition';
import type { ComponentFor } from 'handle/iterate';
import type { ComponentIf } from 'handle/switch';

export interface BabelFile extends File {
  buildCodeFrameError<TError extends Error>(
    node: t.Node,
    msg: string,
    Error?: new (msg: string) => TError
  ): TError;
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