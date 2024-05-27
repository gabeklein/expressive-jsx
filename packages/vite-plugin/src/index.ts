import BabelPreset from '@expressive/babel-preset';
import { TransformResult, transform } from 'transform';
import { ModuleGraph, Plugin } from 'vite';

const PREFIX = "\0virtual:";

const styleModule = (path: string) => PREFIX + path + ".css";

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

  async function transformCache(id: string, code: string){
    const result = await transform(id, code);

    CACHE.set(id, result);
    CACHE.set(styleModule(id), result);

    return result;
  }

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
        return styleModule(importer!);
    },
    async load(path: string){
      const cached = CACHE.get(path);

      if(cached && path.startsWith(PREFIX))
        return cached.css;
    },
    async transform(code, id){
      const result = CACHE.get(id);

      if(result)
        return id.startsWith(PREFIX) ? result.css : result;

      if(accept(id))
        return transformCache(id, code);
    },
    async handleHotUpdate(context){
      const { file, modules } = context;
      const cached = CACHE.get(file);

      if(!cached)
        return;

      const source = await context.read();
      const result = await transformCache(file, source);

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