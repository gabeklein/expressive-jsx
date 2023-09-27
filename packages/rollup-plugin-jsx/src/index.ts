import { Options as TransformOptions } from "@expressive/babel-preset-react"
import * as babel from '@babel/core';
import * as path from 'path';
import { Plugin } from "rollup";

const CWD = process.cwd();
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
  const CHECKSUM = new Map<string, number>();
  const STYLESHEET = new Map();

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
      if(STYLESHEET.has(id))
        return '\0' + id;
    },
    load(id: string) {
      if(id.startsWith('\0'))
        return STYLESHEET.get(id.slice(1));
    },
    async transform(source, id){
      if(/node_modules/.test(id) || !shouldTransform(id, source))
        return;

      const result = await transform(id, source, options);
      const { uri, code, css } = result;

      if(server){
        id = relative(id);
        const hash = cheapHash(code)

        if(!CHECKSUM.has(id))
          CHECKSUM.set(id, hash);

        else if(CHECKSUM.get(id) === hash)
          CHECKSUM.delete(id);

        if(css !== STYLESHEET.get(uri)){
          const module = server.moduleGraph.getModuleById("\0" + uri);
  
          if(module)
            server.reloadModule(module);
        }
      }

      STYLESHEET.set(uri, css);

      return {
        code,
        map: result.map
      };
    }
  }
}

export default jsxPlugin;

async function transform(id: string, code: string, options?: Options){
  let stylesheet = "";

  const result = await babel.transformAsync(code, {
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
        extractCss(css: string){
          stylesheet = css;
        }
      }]
    ]
  });

  if(!result)
    throw new Error("No result");

  const virtual = "virtual:" + relative(id) + ".css";

  return {
    code: result.code + `\nimport "${virtual}";`,
    map: result.map,
    css: stylesheet,
    uri: virtual
  }
}

function cheapHash(input: string){
  let hash = 0;

  for(let i = 0; i < input.length; i++){
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }

  return hash;
}