// import generate from '@babel/generator';
// import traverse from '@babel/traverse';
import { createFilter } from '@rollup/pluginutils';
import path from 'path';
import { Plugin } from 'rollup';

import { transform } from './transform';

type Options = {
  include?: string | string[];
  exclude?: string | string[];
};

function expressiveJSX(options: Options = {}): Plugin {
  const filter = createFilter(options.include || ['**/*.jsx']);

  return {
    name: 'rollup-plugin-expressive-jsx',

    async transform(code, id) {
      if (!filter(id)) return null;

      const result = await transform(id, code);

      return {
        code: result.code,
        map: result.map,
        meta: {
          css: result.css,
          cssFilename: `./${path.basename(id).replace(/\.[jt]sx?$/, '')}.css`,
        },
      }
    },

    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        const { meta } = chunk as any;

        if (chunk.type === 'chunk' && meta?.css && meta?.cssFilename) {
          this.emitFile({
            type: 'asset',
            fileName: path.posix.join(path.dirname(fileName), meta.cssFilename),
            source: meta.css,
          });
        }
      }
    },
  };
}

export default expressiveJSX;