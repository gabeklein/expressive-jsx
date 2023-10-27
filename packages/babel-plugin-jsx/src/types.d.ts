import type * as $ from '@babel/types';

import type { Style, Prop } from 'handle/attributes';
import type { ElementInline } from 'handle/definition';
import type { ComponentFor } from 'handle/iterate';
import type { ComponentIf } from 'handle/switch';

export type * from '@babel/types';
export type {
  Hub,
  NodePath as Path,
  Scope,
  VisitNodeObject,
  VisitNode
} from '@babel/traverse';

export interface BabelFile extends File {
  buildCodeFrameError<TError extends Error>(
    node: $.Node,
    msg: string,
    Error?: new (msg: string) => TError
  ): TError;
}

export interface PropData {
  name: string | false | undefined
  value: $.Expression
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
  | $.Statement;

export type InnerContent =
  | $.Expression
  | ElementInline
  | ComponentIf
  | ComponentFor;