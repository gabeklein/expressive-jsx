import { PluginObj } from '@babel/core';
import JSXPreset from '@expressive/babel-preset';
import { Compiler } from 'webpack';
import VirtualModulesPlugin from 'webpack-virtual-modules';

const BABEL_LOADER = require.resolve('babel-loader');

export interface Options extends JSXPreset.Options {} 

declare namespace ExpressiveJSXPlugin {
  export { Options };
}

class ExpressiveJSXPlugin {
  constructor(private options: Options = {}){}

  apply(compiler: Compiler){
    const virtual = new VirtualModulesPlugin();    
    const handled = new Set<string>();
    
    virtual.apply(compiler);

    compiler.hooks.compilation.tap("ExpressiveJSXPlugin", (compilation) => {
      const { loader } = compiler.webpack.NormalModule.getCompilationHooks(compilation);

      loader.tap("ExpressiveJSXPlugin", (_context: any, module) => {
        const { resource } = module;
        
        if(handled.has(resource) || !/\.jsx$/.test(resource) || /node_modules/.test(resource))
          return;
  
        handled.add(resource);

        const cssModule = resource + ".module.css";

        module.loaders.push({
          ident: null,
          loader: BABEL_LOADER,
          type: null,
          options: {
            presets: [
              [JSXPreset, { ...this.options, cssModule }]
            ],
            plugins: [
              [<PluginObj>{
                post({ metadata }){
                  const { css } = metadata as any;

                  if(!css)
                    return;

                  virtual.writeModule(cssModule, css);
                }
              }]
            ]
          }
        });
      })
    })
  }
}

export default ExpressiveJSXPlugin;