const VirtualModulesPlugin = require('webpack-virtual-modules');

module.exports = class ExpressivePlugin {
  constructor(options = {}){
    this.options = options;
  }

  apply(compiler){
    const virtualModules = new VirtualModulesPlugin();

    virtualModules.apply(compiler);

    compiler.hooks.compilation.tap("ExpressivePlugin", (compilation) => {
      const { loader } = compiler.webpack.NormalModule.getCompilationHooks(compilation);

      loader.tap("ExpressivePlugin", (loaderContext, module) => {
        const { resource, loaders } = module;
        
        if(!/\.jsx?$/.test(resource) || /node_modules/.test(resource))
          return;

        let exists = false;

        loaders.push({
          ident: null,
          loader: "babel-loader",
          type: null,
          options: {
            presets: [
              ["@expressive/babel-preset", {
                extractCss: (css) => {
                  const filename = resource + ".module.css";
  
                  if(!exists){
                    loaderContext.addDependency(filename);
                    exists = true;
                  }
  
                  virtualModules.writeModule(filename, css);
                  return filename;
                },
                ...this.options
              }]
            ]
          }
        })
      })
    })
  }
}