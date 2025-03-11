import { ModuleGraph, Plugin } from 'vite';
import { relative, dirname, basename } from 'path';

import { transform, TransformOptions, TransformResult } from './transform';

// Use a proper virtual module prefix that Vite recognizes
const VIRTUAL_CSS = "\0virtual:css:";
const getCssId = (path: string) => VIRTUAL_CSS + localize(path) + ".css";
const localize = (path: string) => relative(process.cwd(), path);

const DEFAULT_SHOULD_TRANSFORM = (id: string) =>
  !/node_modules/.test(id) && id.endsWith(".jsx");

export interface Options extends TransformOptions {
  test?: RegExp | ((uri: string) => boolean);
  build?: {
    // Where to emit CSS files relative to JS files
    cssDir?: string;
    // Whether to emit a single combined CSS file (default: false = separate CSS per component)
    combineCss?: boolean;
    // Custom filename for the combined CSS (if combineCss is true)
    cssFilename?: string;
  };
}

function jsxPlugin(options: Options = {}): Plugin {
  const test = options.test;
  const accept: (id: string) => boolean =
    typeof test == "function" ? test :
      test instanceof RegExp ? id => test.test(id) :
        DEFAULT_SHOULD_TRANSFORM;

  const buildOptions = {
    cssDir: 'assets',
    combineCss: false,
    cssFilename: 'style.css',
    ...options.build
  };

  const CACHE = new Map<string, TransformResult>();
  const CSS_MAP = new Map<string, string>();
  const CSS_MODULES = new Map<string, string>(); // For build mode: Map component ID to CSS file name

  let moduleGraph!: ModuleGraph;
  let isBuild = false;
  let allCssContent = ''; // For combined CSS in build mode

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
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    configureServer(server) {
      moduleGraph = server.moduleGraph;
    },
    resolveId(id) {
      if(id == "@expressive/babel-preset/polyfill")
        return require.resolve(id);

      console.log('isBuild', isBuild, id);

      // In dev mode, handle virtual CSS modules
      if(!isBuild && id.startsWith(VIRTUAL_CSS))
        return id;

      // In build mode, map virtual CSS to real file paths
      if(isBuild && id.startsWith(VIRTUAL_CSS)) {
        const sourceId = id.slice(VIRTUAL_CSS.length, -4);
        
        if(buildOptions.combineCss)
          // For combined CSS, we'll generate a single CSS file later
          return `\0:${buildOptions.cssFilename}`;

        // For separate CSS files, generate a unique name based on the component
        const componentName = basename(sourceId).replace(/\.[^/.]+$/, "");
        const cssFilename = `${componentName}.css`;
        const cssPath = `${buildOptions.cssDir}/${cssFilename}`;
        
        // Store mapping for later emission
        CSS_MODULES.set(sourceId, cssPath);
        
        return cssPath;
      }

      if(CSS_MAP.has(id))
        return id;
        
      return null;
    },
    load(id) {
      // Handle virtual CSS in dev mode
      if(!isBuild && id.startsWith(VIRTUAL_CSS)) {
        const sourceId = id.slice(VIRTUAL_CSS.length, -4);
        const result = CACHE.get(sourceId);

        if(result && result.css)
          return result.css;
      }
      
      // Handle combined CSS placeholder in build mode
      if(isBuild && id === `\0:${buildOptions.cssFilename}`)
        return allCssContent;

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

        if(result.css) {
          // In build mode with combined CSS, collect all CSS
          if(isBuild && buildOptions.combineCss)
            allCssContent += `/* From ${id} */\n${result.css}\n\n`;
          
          // Add import for the CSS
          result.code += `\nimport "${getCssId(id)}";`;
        }

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
    },
    
    // Build mode hooks
    generateBundle(outputOptions, bundle) {
      if(!isBuild) return;
      
      if(buildOptions.combineCss && allCssContent) {
        // Emit a single combined CSS file
        this.emitFile({
          type: 'asset',
          fileName: buildOptions.cssFilename,
          source: allCssContent
        });
      } else {
        // Emit separate CSS files for each component
        for (const [sourceId, cssPath] of CSS_MODULES.entries()) {
          const result = CACHE.get(sourceId);
          if(result && result.css) {
            this.emitFile({
              type: 'asset',
              fileName: cssPath,
              source: result.css
            });
          }
        }
      }
    }
  };
}

export default jsxPlugin;