import * as babel from '@babel/core';
import BabelPreset from '@expressive/babel-preset';
import { relative } from 'path';
import { ModuleGraph, ModuleNode, Plugin } from 'vite';

const CWD = process.cwd();
const PREFIX = "\0expressive:";

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
        return PREFIX + relative(CWD, importer!) + ".css";
    },
    async transform(code, id){
      if(!accept(id))
        return;

      const result = await transformJSX(id, code);

      CACHE.set(id.replace(CWD + "/", ""), result);

      if(result.css)
        result.code += `\nimport "__EXPRESSIVE_CSS__";`;

      return result;
    },
    async load(path: string) {
      if(path.startsWith(PREFIX)){
        const name = path.slice(12, -4);
        return CACHE.get(name)!.css;
      }
    },
    async handleHotUpdate(context){
      const path = context.file;
      const id = relative(CWD, path);
      const cached = CACHE.get(id);

      if(!cached)
        return;

      const updated: ModuleNode[] = [];
      const source = await context.read();
      const result = await transformJSX(path, source);

      CACHE.set(id, result);

      if(cached.code !== result.code)
        updated.push(
          moduleGraph.getModuleById(path)!
        );

      if(cached.css !== result.css)
        updated.push(
          moduleGraph.getModuleById("\0virtual:" + id + ".css")!
        );

      return updated;
    }
  }
}

export default jsxPlugin;

interface TransformResult {
  code: string;
  map: any;
  css: string;
}

async function transformJSX(id: string, input: string){
  const result = await babel.transformAsync(input, {
    root: CWD,
    filename: id,
    sourceFileName: id.split("?")[0],
    sourceMaps: true,
    parserOpts: {
      sourceType: "module",
      allowAwaitOutsideFunction: true
    },
    generatorOpts: {
      decoratorsBeforeExport: true
    },
    presets: [
      BabelPreset
    ]
  });

  if(!result)
    throw new Error("No result");

  let { code, map, metadata: { css } } = result as BabelPreset.Result;

  if(!code)
    throw new Error("No code");

  return <TransformResult> {
    code,
    css,
    map
  };
}