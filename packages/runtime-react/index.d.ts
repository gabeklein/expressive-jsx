import { string } from 'prop-types';

interface BunchOf<T> {
  [key: string]: T
}

/**
 * Expressive-React Runtime Style Singleton
 * 
 * Exposed to all modules consuming the expressive-react style API. 
 * Accumulates and handles all style defined using this method.
 * 
 * On page-load this will spawn a `<style>`, fill it, and propagate any updates automatically.
 */
interface RuntimeStyleController {

  /**
   * Collection of post-processed style chunks.
   * 
   * Dumped to `cssText`.
   */
  chunks: BunchOf<string>;

  /**
   * Collection of keys which are already-defined styles, actively included in stylesheet.
   * 
   * Values are `true` where style chunk is unclaimed. 
   * Where claimed by a reference or module, value is that unique identifier.
   */
  contentIncludes: BunchOf<boolean | string>;

  /**
   * Reference to slave <style> tag
   */
  ref?: HTMLStyleElement;

  /**
   * Computed CSS body.
   */
  cssText: string;

  /**
   * Apply styles within in `cssText` to global stylesheet.
   * 
   * @param cssText - plain CSS to be included
   * @param reoccuringKey - dedupe identifier (for HMR or dynamic style)
   */
  include(cssText: string, reoccuringKey: string): void;
}

export default RuntimeStyleController

/**
 * Return children as array.
 * 
 * @param props Component props from which to retrieve children.
 */
export declare function body(props: { children: any | any[] }): any[];

/**
 * Joins all truthy arguments using a space as delimiter.
 */
export declare function join(...args: string[]): string;