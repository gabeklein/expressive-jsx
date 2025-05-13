import { createFilter } from '@rollup/pluginutils';
import { Plugin } from 'rollup';

import { transform } from './transform';

type Options = {
  include?: string | string[];
  exclude?: string | string[];
};

const STYLE_INJECT_ID = '\0style-inject';
const STYLE_INJECT = `export default function style(css) {
  if (!css || typeof window === 'undefined') return;
  const style = document.createElement('style');
  style.setAttribute('type', 'text/css');
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}`;

const importInject = (css: string) => {
  return `\n\nimport style from '${STYLE_INJECT_ID}';\nstyle(${JSON.stringify(css)});`;
};

function expressiveJSX(options: Options = {}): Plugin {
  const filter = createFilter(options.include || ['**/*.jsx']);

  return {
    name: 'rollup-plugin-expressive-jsx',

    async transform(code, id) {
      if (!filter(id)) return null;

      const result = await transform(id, code);

      if (!result.css)
        return result;

      return {
        code: result.code + importInject(result.css),
        map: result.map,
      };
    },

    resolveId(source) {
      if (source === STYLE_INJECT_ID)
        return source;

      return null;
    },

    load(id) {
      if (id === STYLE_INJECT_ID)
        return STYLE_INJECT;

      return null;
    },
  };
}

export default expressiveJSX;