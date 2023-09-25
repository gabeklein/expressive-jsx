import { Options as TransformOptions } from "@expressive/babel-preset-react"
import * as babel from '@babel/core';
import { relative } from 'path';
import { Plugin } from "rollup";

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
}

export interface Options extends TransformOptions {
  test?: RegExp | ((uri: string, code: string) => boolean);
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
  const files = new Map();

  /**
   * In the event a vite development server is running, we
   * can use it to reload the module when the CSS changes.
   *  
   * @type {import('vite').ViteDevServer}
   */
  let server: any;

  return {
    name: "expressive-jsx",
    enforce: "pre",
    configureServer(_server){
      server = _server;
    },
    resolveId(id){
      if(files.has(id))
        return '\0' + id;
    },
    load(id: string) {
      if(id.startsWith('\0'))
        return files.get(id.slice(1));
    },
    async transform(code, id){
      if(/node_modules/.test(id) || !shouldTransform(id, code))
        return;

      const result = await transform(id, code, options);

      if(!result)
        return;

      const { uri, css } = result;

      if(server){
        const module = server.moduleGraph.getModuleById("\0" + uri);

        if(module && css !== files.get(uri))
          server.reloadModule(module);
      }

      files.set(uri, css);

      return {
        code: result.code,
        map: result.map
      };
    }
  }
}

export default jsxPlugin;

async function transform(id: string, code: string, options?: Options){
  const root = process.cwd();
  const uri = "virtual:" + relative(root, id) + ".css";
  let cssText = "";

  const result = await babel.transformAsync(code, {
    root,
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
        extractCss(css: string){
          cssText = css;
        }
      }]
    ]
  });

  if(result)
    return {
      code: result.code + `\nimport "${uri}";`,
      map: result.map,
      css: cssText,
      uri
    }
}