import { DefineContext } from './context/DefineContext';
import { ElementContext } from './context/ElementContext';

export type Macro =
  (this: DefineContext, ...args: any[]) =>
    Record<string, any> | void;

export interface Options {
  macros?: Record<string, Macro>[];
  define?: Record<string, DefineContext>[];
  apply?(element: ElementContext): void;
  polyfill?: string | null;
}