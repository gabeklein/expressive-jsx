// import generate from '@babel/generator';
// import traverse from '@babel/traverse';
import { transformAsync } from '@babel/core';
import { createFilter } from '@rollup/pluginutils';
import BabelPreset from '@expressive/babel-preset';
import path from 'path';

import type { Plugin } from 'rollup';

type Options = {
  include?: string | string[];
  exclude?: string | string[];
};

interface TransformResult {
  code: string;
  map: any;
  css: string;
}

function cssLabeledPlugin(options: Options = {}): Plugin{
  const filter = createFilter(options.include || ['**/*.jsx']);

  return {
    name: 'rollup-plugin-css-labeled',

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

      // // Add import statement to the AST
      // const cssFilename = `./${path.basename(id).replace(/\.[jt]sx?$/, '')}.css`;
      // // const importDecl = t.importDeclaration([], t.stringLiteral(cssFilename));
      // // ast.program.body.unshift(importDecl);

      // const output = generate(result.ast!, {}, code);

      // return {
      //   code: result.code,
      //   map: result.map,
      //   meta: {
      //     css: cssChunks.join('\n'),
      //     cssFilename,
      //   },
      // };
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

async function transform(
  id: string,
  input: string,
  presetOptions: BabelPreset.Options = {}
): Promise<TransformResult> {
  const result = await transformAsync(input, {
    root: process.cwd(),
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
      [BabelPreset, presetOptions]
    ]
  });

  if (!result)
    throw new Error("No result");

  let {
    code,
    map,
    metadata
  } = result;

  let css = (metadata as any)?.css || "";

  if (!code)
    throw new Error("No code");

  return <TransformResult> {
    code,
    css,
    map
  };
}


export = cssLabeledPlugin;