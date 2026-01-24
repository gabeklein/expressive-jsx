import JSXPreset from "@expressive/babel-preset";

export interface Options extends JSXPreset.Options {
  /** 
   * Enable CSS module generation for styled components
   * @default true
   */
  enableCSSModules?: boolean;
  
  /**
   * Custom CSS module naming pattern
   * @default "[name].[hash].module.css"
   */
  cssModulePattern?: string;
}

declare function withExpressiveJSX(options?: Options): (nextConfig?: any) => any;

export default withExpressiveJSX;
