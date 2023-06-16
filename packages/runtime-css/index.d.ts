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
   * Reference to slave <style> tag
   */
  styleElement?: HTMLStyleElement;

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
  put(cssText: string, reoccuringKey: string): void;
}

declare namespace css {
  interface Options {
    module?: string;
    refreshToken?: string;
  }
}

/**
 * Register new styles for application.
 */
declare function css(stylesheet: string, options: css.Options): void;

export default css;

/**
 * Return children as array.
 * 
 * @param props Component props from which to retrieve children.
 */
export declare function body(props: { children: any | any[] }): any[];

/**
 * Use styles.
 * 
 * Joins all truthy arguments using a space as delimiter.
 */
export declare function use(...args: string[]): string;

/**
 * 
 * 
 * Simple accumulator. Invokes argument; returns array of all data supplied to `push()`. 
 */
 export declare function collect<T>(
  accumulator: (push: (...data: T[]) => void) => void
 ): T[];