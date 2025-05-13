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
  const virtualCssMap = new Map<string, string>();
  const dotcss = (str: string) => str.replace(/\.[jt]sx?$/, '.x.css')

  return {
    name: 'rollup-plugin-expressive-jsx',

    async transform(code, id) {
      if (!filter(id)) return null;

      const result = await transform(id, code);

      if (!result.css)
        return result;

      const cssFilePath = dotcss(id);
      virtualCssMap.set(cssFilePath, result.css);

      return {
        code: result.code + `\nimport './${path.basename(cssFilePath)}';\n`,
        map: result.map,
      };
    },

    resolveId(source, importer) {
      if(importer && source === './' + dotcss(path.basename(importer)))
        return dotcss(importer);

      return null;
    },

    load(id) {
      return virtualCssMap.get(id) || null;
    },
  };
}

export default expressiveJSX;