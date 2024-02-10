import { DefineContext } from './context';
import * as t from './types';

export type Macro =
    (this: DefineContext, ...args: any[]) =>
      Record<string, any> | void;

export interface Options {
  macros?: Record<string, Macro>[];
  define?: Record<string, DefineContext>[];
  assign?(this: DefineContext, ...args: any[]): void;
  apply?(this: DefineContext, path: t.NodePath<t.JSXElement>): void;
  polyfill?: string;
}

export const Options: Options = {};