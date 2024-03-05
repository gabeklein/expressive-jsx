import * as babel from '@babel/core';
import Preset from '@expressive/babel-preset-web';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ModuleGraph, ModuleNode, Plugin } from 'vite';

const CWD = process.cwd();
const PREFIX = "\0virtual:";
const relative = path.relative.bind(path, CWD);

export interface Options extends Preset.Options {
  test?: RegExp | ((uri: string) => boolean);
}

function jsxPlugin(options?: Options): Plugin {
  let test = options && options.test;
  let moduleGraph!: ModuleGraph;

  if(!test)
    test = (id: string) => !/node_modules/.test(id) && id.endsWith(".jsx");
  else if(test instanceof RegExp){
    const regex = test;
    test = (id: string) => regex.test(id);
  }

  const shouldTransform = test;
  const CACHE = new Map<string, TransformResult>();

  return {
    name: "expressive-jsx",
    enforce: "pre",
    configureServer(server){
      moduleGraph = server.moduleGraph;
    },
    resolveId(id, importer){
      if(id === "__EXPRESSIVE_CSS__")
        return '\0virtual:' + relative(importer!) + ".css";
    },
    async load(path: string) {
      if(path.startsWith(PREFIX))
        return CACHE.get(path.slice(9, -4))!.css;

      if(!shouldTransform(path))
        return;

      const id = relative(path);

      if(CACHE.has(id))
        return CACHE.get(id);

      const source = await fs.readFile(path, "utf8");
      const result = await transform(id, source, options);

      CACHE.set(id, result);

      return result;
    },
    async handleHotUpdate(context){
      const path = context.file;
      const id = relative(path);
      const cached = CACHE.get(id);

      if(!cached)
        return;

      const updated: ModuleNode[] = [];
      const source = await context.read();
      const result = await transform(path, source, options);

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

async function transform(
  id: string,
  input: string,
  options?: Options
): Promise<TransformResult> {
  let css = "";

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
      [Preset, <Preset.Options> {
        onStyleSheet(stylesheet){
          css = stylesheet;
        }
      }]
    ]
  });

  if(!result)
    throw new Error("No result");

  let { code, map } = result;

  if(!code)
    throw new Error("No code");

  if(css)
    code += `\nimport "__EXPRESSIVE_CSS__";`;

  return {
    code,
    css,
    map
  };
}