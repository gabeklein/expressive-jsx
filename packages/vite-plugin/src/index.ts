import { ModuleGraph, Plugin } from 'vite';

import { transform, TransformOptions, TransformResult } from './transform';
import { relative } from 'path';

const VIRTUAL_CSS = "\0virtual:css:";
const getCssId = (path: string) => VIRTUAL_CSS + localize(path) + ".css";
const localize = (path: string) => {
  const cwd = process.cwd();
  return path.startsWith(cwd) ? "/" + relative(cwd, path) : path;
}

const DEFAULT_SHOULD_TRANSFORM = (id: string) => id.endsWith(".jsx");

export interface Options extends TransformOptions {
  test?: RegExp | ((uri: string) => boolean);
}

function jsxPlugin(options: Options = {}): Plugin {
  const test = options.test;
  const accept: (id: string) => boolean =
    typeof test == "function" ? test :
      test instanceof RegExp ? id => test.test(id) :
        DEFAULT_SHOULD_TRANSFORM;

  const CACHE = new Map<string, TransformResult>();
  const CSS_MAP = new Map<string, string>();
  let moduleGraph!: ModuleGraph;

  async function transformCache(id: string, code: string) {
    const result = await transform(id, code, options);

    CACHE.set(id, result);

    if(result.css) {
      const cssId = getCssId(id);
      CSS_MAP.set(cssId, id);
    }

    return result;
  }

  return {
    name: "expressive-jsx-plugin",
    enforce: "pre",
    configureServer(server) {
      moduleGraph = server.moduleGraph;
    },
    resolveId(id) {
      if(id == "@expressive/babel-preset/polyfill")
        return require.resolve(id);

      if(id.startsWith(VIRTUAL_CSS))
        return id;

      if(CSS_MAP.has(id))
        return id;
    },
    load(id) {
      if(id.startsWith(VIRTUAL_CSS)) {
        const sourceId = id.slice(VIRTUAL_CSS.length, -4);
        const result = CACHE.get(sourceId);

        if(result && result.css)
          return result.css;
      }

      const sourceId = CSS_MAP.get(id);
  
      if(sourceId) {
        const result = CACHE.get(sourceId);

        if(result && result.css)
          return result.css;
      }

      return null;
    },
    async transform(code, id) {
      if(id.startsWith(VIRTUAL_CSS))
        return null;

      const cached = CACHE.get(id);

      if(cached)
        return cached;

      if(accept(id)){
        const result = await transformCache(id, code);

        if(result.css)
          result.code += `\nimport "${getCssId(id)}";`;

        return result;
      }

      return null;
    },
    async handleHotUpdate(context) {
      const { file, modules } = context;
      const cached = CACHE.get(file);

      if(!cached)
        return;

      const source = await context.read();
      const result = await transformCache(file, source);

      if(cached.code == result.code)
        modules.pop();

      if(cached.css == result.css)
        return;

      const cssModule = moduleGraph.getModuleById(getCssId(file));

      if(cssModule)
        modules.push(cssModule);
    }
  }
}

export default jsxPlugin;