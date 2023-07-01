import { Compilation, Compiler, NormalModule } from 'webpack';
import VirtualModulesPlugin from 'webpack-virtual-modules';

export class ExtractCSSPlugin {
  apply(compiler: Compiler){
    const virtualModules = new VirtualModulesPlugin();

    virtualModules.apply(compiler);

    compiler.hooks.compilation.tap("ExtractCSSPlugin", (compilation: Compilation) => {
      const { loader } = NormalModule.getCompilationHooks(compilation);

      loader.tap("ExtractCSSPlugin", (loaderContext: any, module) => {
        const { resource, loaders } = module;
        
        if(!/\.js$/.test(resource) || /node_modules/.test(resource))
          return;

        for(const { loader, options } of loaders){
          if(!loader.includes("babel-loader") || !options.presets)
            continue;

          options.presets = options.presets.map((preset: any) => {
            const name = Array.isArray(preset) ? preset[0] : preset;
            let exists = false;

            if(!/@expressive\/(?:babel-preset)?-react/.test(name))
              return preset;

            return [name, {
              ...Array.isArray(preset) ? preset[1] : {},
              extractCss: (css: string) => {
                const filename = resource + ".css";

                if(!exists){
                  loaderContext.addDependency(filename);
                  exists = true;
                }

                virtualModules.writeModule(filename, css);
                return filename;
              }
            }]
          });
        }
      })
    })
  }
}