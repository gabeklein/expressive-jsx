import { DefineContext } from './context';
import { ElementContext } from './elements';

export type Macro =
  (this: DefineContext, ...args: any[]) =>
    Record<string, any> | void;

export interface Options {
  macros?: Record<string, Macro>[];
  define?: Record<string, DefineContext>[];
  apply(element: ElementContext): void;
  polyfill?: string | null;
}