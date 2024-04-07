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
    const virtualModules = new VirtualModulesPlugin();
    virtualModules.apply(compiler);

    compiler.hooks.compilation.tap("ExpressiveJSXPlugin", (compilation) => {
      const { loader } = compiler.webpack.NormalModule.getCompilationHooks(compilation);

      loader.tap("ExpressiveJSXPlugin", (_context, module) => {
        const { resource } = module;
        
        if(!/\.jsx$/.test(resource) || /node_modules/.test(resource))
          return;

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

                  if(css){
                    // loaderContext.addDependency(filename);
                    virtualModules.writeModule(cssModule, css);
                  }
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