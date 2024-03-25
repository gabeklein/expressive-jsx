import { NodePath } from '@babel/traverse';
import { JSXElement } from '@babel/types';

import { Context, Element } from './context/Context';

export type Macro =
  (this: Context, ...args: any[]) => Record<string, any> | void;

export interface Options {
  macros?: Record<string, Macro>[];
  define?: Record<string, Context>[];
  apply?(path: NodePath<JSXElement>, element: Element): void;
  polyfill?: string | null;
}