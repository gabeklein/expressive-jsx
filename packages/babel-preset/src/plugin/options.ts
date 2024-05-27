import { PluginPass } from '@babel/core';

import { Context } from './context';

export type Macro =
  (this: Context, ...args: any[]) => Record<string, any> | void;

export interface Options {
  macros?: Record<string, Macro>[];
  define?: Record<string, Context>[];
  polyfill?: string | null;
}

export type BabelState = PluginPass & {
  context: Context;
  opts: Options;
}