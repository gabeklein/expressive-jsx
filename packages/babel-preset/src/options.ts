import { PluginPass } from '@babel/core';
import { NodePath } from '@babel/traverse';
import { JSXElement } from '@babel/types';

import { Context } from './context';

export type Macro =
  (this: Context, ...args: any[]) => Record<string, any> | void;

export interface Options {
  macros?: Record<string, Macro>[];
  define?: Record<string, Context>[];
  polyfill?: string | null;
  apply?(
    path: NodePath<JSXElement>,
    using: Iterable<Context>,
    state: BabelState
  ): void;
}

export type BabelState = PluginPass & {
  context: Context;
  opts: Options;
}