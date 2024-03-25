import { PluginPass } from '@babel/core';
import { NodePath } from '@babel/traverse';
import { JSXElement } from '@babel/types';

import { Context } from './context/Context';
import { Element } from './context/Element';

export type Macro =
  (this: Context, ...args: any[]) => Record<string, any> | void;

export interface Options {
  macros?: Record<string, Macro>[];
  define?: Record<string, Context>[];
  apply?(path: NodePath<JSXElement>, using: Set<Context>): void;
  polyfill?: string | null;
}

export type BabelState = PluginPass & {
  context: Context;
  opts: Options;
}