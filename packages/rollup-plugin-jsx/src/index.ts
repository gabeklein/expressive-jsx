import { Options as TransformOptions } from "@expressive/babel-preset-react"
import * as babel from '@babel/core';
import path from 'path';
import fs from 'fs/promises';
import { Plugin } from "rollup";
// import { ModuleNode, ViteDevServer } from "vite";

const CWD = process.cwd();
const PREFIX = "\0virtual:";
const relative = path.relative.bind(path, CWD);

/**
 * Rollup plugin but also may be used in
 * [Vite](https://vitejs.dev/guide/api-plugin.html#rollup-plugin-compatibility).
 * 
 * Vite support includes support for hot module reloading.
 */
interface PluginCompat extends Plugin {
  name: string;
  enforce?: "pre" | "post";
  configureServer?(server: any): void;
  handleHotUpdate?(ctx: any): void;
}

export interface Options extends TransformOptions {
  test?: RegExp | ((uri: string) => boolean);
}

function jsxPlugin(options?: Options): PluginCompat {
  let test = options && options.test;

  if(!test)
    test = (id: string) => id.endsWith(".jsx");
  else if(test instanceof RegExp){
    const regex = test;
    test = (id: string) => regex.test(id);
  }

  const shouldTransform = test;
  const CACHE = new Map<string, TransformResult>();

  /**
   * In the event a vite development server is running, we
   * can use it to reload the module when the CSS changes.
   */
  let server: any;

  return {
    name: "expressive-jsx",
    enforce: "pre",
    configureServer(_server){
      server = _server;
    },
    resolveId(id, importer){
      if(id === "__EXPRESSIVE_CSS__")
        return '\0virtual:' + relative(importer!) + ".css";
    },
    async load(path: string) {
      if(path.startsWith(PREFIX))
        return CACHE.get(path.slice(9, -4))!.css;

      if(/node_modules/.test(path))
        return;

      const id = relative(path);

      if(CACHE.has(id))
        return CACHE.get(id);

      if(!shouldTransform(id))
        return;

      const source = await fs.readFile(path, "utf8");
      const result = await transform(id, source, options);

      CACHE.set(id, result);

      return result.code;
    },
    async handleHotUpdate(context){
      const { file } = context;
      const id = relative(file);
      const cached = CACHE.get(id);

      if(!cached)
        return;

      const { moduleGraph } = server;
      const source = await context.read();
      const result = await transform(file, source, options);
      const invalidate: any[] = [];

      CACHE.set(id, result);

      if(cached.code !== result.code){
        const module = moduleGraph.getModuleById(file);
        invalidate.push(module!);
      }

      if(cached.css !== result.css){
        const module = moduleGraph.getModuleById("\0virtual:" + id + ".css");
        invalidate.push(module!);
      }

      return invalidate;
    }
  }
}

export default jsxPlugin;

interface TransformResult {
  code: string;
  map: any;
  css: string;
}

async function transform(id: string, input: string, options?: Options){
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
      ["@expressive/babel-preset-react", {
        output: "jsx",
        cssModule: false,
        printStyle: "pretty",
        ...options,
        extractCss(text: string){
          css = text;
        }
      }]
    ]
  });

  if(!result)
    throw new Error("No result");

  let { code } = result;

  if(css)
    code += `\nimport "__EXPRESSIVE_CSS__";`;

  return <TransformResult> {
    code,
    css,
    map: result.map
  }
}