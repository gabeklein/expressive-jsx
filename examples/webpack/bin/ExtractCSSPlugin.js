import { Compilation, Compiler, NormalModule } from 'webpack';
import VirtualModulesPlugin from 'webpack-virtual-modules';

module.exports = class ExpressiveJSXPlugin {
  apply(compiler){
    const virtualModules = new VirtualModulesPlugin();

    virtualModules.apply(compiler);

    compiler.hooks.compilation.tap("ExpressiveJSXPlugin", (compilation) => {
      const { loader } = NormalModule.getCompilationHooks(compilation);

      loader.tap("ExpressiveJSXPlugin", (loaderContext, module) => {
        const { resource, loaders } = module;
        
        if(!/\.js$/.test(resource) || /node_modules/.test(resource))
          return;

        let exists = false;

        loaders.push({
          ident: 'ruleSet[1].rules[0].use',
          loader: require.resolve("babel-loader"),
          type: null,
          options: {
            presets: [
              [require.resolve("@expressive/babel-preset-react"), {
                extractCss: (css) => {
                  const filename = resource + ".css";
  
                  if(!exists){
                    loaderContext.addDependency(filename);
                    exists = true;
                  }
  
                  virtualModules.writeModule(filename, css);
                  return filename;
                }
              }]
            ]
          }
        })
      })
    })
  }
}