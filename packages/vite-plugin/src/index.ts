import { relative } from 'path';
import { ModuleGraph, Plugin } from 'vite';

import { transform, TransformOptions, TransformResult } from './transform';

const VIRTUAL_CSS = "\0virtual:css:";

const getCssId = (path: string) => VIRTUAL_CSS + localize(path) + ".css";
const localize = (path: string) => {
  const cwd = process.cwd();
  return path.startsWith(cwd) ? "/" + relative(cwd, path) : path;
}

const DEFAULT_SHOULD_TRANSFORM = (id: string) =>
  !/node_modules/.test(id) && id.endsWith(".jsx");

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
  let moduleGraph!: ModuleGraph;

  async function transformCache(id: string, code: string) {
    const result = await transform(id, code, options);

    if(result.css)
      result.code += `\nimport "__EXPRESSIVE_CSS__";`;

    CACHE.set(id, result);
    CACHE.set(getCssId(id), result);

    return result;
  }

  return {
    name: "expressive-jsx-plugin",
    enforce: "pre",
    configureServer(server) {
      moduleGraph = server.moduleGraph;
    },
    resolveId(id, importer) {
      if(id === "__EXPRESSIVE_CSS__")
        return getCssId(importer!);
    },
    load(path: string) {
      const cached = CACHE.get(path);

      if(cached && path.startsWith(VIRTUAL_CSS))
        return cached.css;
    },
    async transform(code, id) {
      const result = CACHE.get(id);

      if(result)
        return id.startsWith(VIRTUAL_CSS) ? result.css : result;

      if(accept(id))
        return transformCache(id, code);

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