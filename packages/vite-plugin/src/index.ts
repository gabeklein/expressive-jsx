import * as babel from '@babel/core';
import BabelPreset from '@expressive/babel-preset';
import { relative } from 'path';
import { ModuleGraph, Plugin } from 'vite';

const CWD = process.cwd();
const PREFIX = "\0expressive:";

const DEFAULT_SHOULD_TRANSFORM = (id: string) =>
  !/node_modules/.test(id) && id.endsWith(".jsx");

const local = (id: string) => "/" + relative(CWD, id);

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
        return PREFIX + local(importer!) + ".css";
    },
    async load(path: string){
      if(path.startsWith(PREFIX)){
        const name = path.slice(12, -4);
        return CACHE.get(name)!.css;
      }
    },
    async transform(code, id){
      if(!accept(id))
        return;

      id = local(id);

      let result = CACHE.get(id);

      if(!result)
        CACHE.set(id, 
          result = await transformJSX(id, code)
        );

      return result;
    },
    async handleHotUpdate(context){
      const id = local(context.file);
      const cached = CACHE.get(id);

      if(!cached)
        return;

      const source = await context.read();
      const result = await transformJSX(id, source);

      CACHE.set(id, result);

      if(cached.code == result.code)
        context.modules.pop();

      if(cached.css !== result.css)
        context.modules.push(
          moduleGraph.getModuleById(PREFIX + id + ".css")!
        );
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

  let {
    code,
    map,
    metadata: { css }
  } = result as BabelPreset.Result;

  if(!code)
    throw new Error("No code");

  if(css)
    code += `\nimport "__EXPRESSIVE_CSS__";`;

  return <TransformResult> {
    code,
    css,
    map
  };
}