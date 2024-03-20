import { Define } from './context/Define';
import { Element } from './context/Element';

export type Macro =
  (this: Define, ...args: any[]) => Record<string, any> | void;

export interface Options {
  macros?: Record<string, Macro>[];
  define?: Record<string, Define>[];
  apply?(element: Element): void;
  polyfill?: string | null;
}