import BabelPreset from '@expressive/babel-preset';
import { TransformResult, transform } from 'transform';
import { ModuleGraph, Plugin } from 'vite';

const PREFIX = "\0virtual:";

const DEFAULT_SHOULD_TRANSFORM = (id: string) =>
  !/node_modules/.test(id) && id.endsWith(".jsx");

export interface Options extends BabelPreset.Options {
  test?: RegExp | ((uri: string) => boolean);
}

function jsxPlugin(options: Options = {}): Plugin {
  const test = options.test;
  const accept: (id: string) => boolean =
    typeof test == "function" ? test :
    test instanceof RegExp ? id => test.test(id) :
    DEFAULT_SHOULD_TRANSFORM;

  const CACHE = new Map<string, TransformResult>();
  let moduleGraph!: ModuleGraph;

  return {
    name: "expressive-jsx-plugin",
    enforce: "pre",
    configureServer(server){
      moduleGraph = server.moduleGraph;
    },
    resolveId(id, importer){
      if(id === "@expressive/babel-preset/polyfill")
        return require.resolve(id);
      
      if(id === "__EXPRESSIVE_CSS__")
        return PREFIX + importer + ".css";
    },
    async load(path: string){
      if(path.startsWith(PREFIX)){
        const name = path.slice(9, -4);
        return CACHE.get(name)!.css;
      }
    },
    async transform(code, id){
      if(!accept(id))
        return;

      let result = CACHE.get(id);

      if(!result)
        CACHE.set(id, 
          result = await transformJSX(id, code)
        );

      return result;
    },
    async handleHotUpdate(context){
      const { file, modules } = context;
      const cached = CACHE.get(file);

      if(!cached)
        return;

      const source = await context.read();
      const result = await transform(file, source);

      CACHE.set(file, result);

      if(cached.code == result.code)
        modules.pop();

      if(cached.css !== result.css)
        modules.push(
          moduleGraph.getModuleById(styleModule(file))!
        );
    }
  }
}

export default jsxPlugin;