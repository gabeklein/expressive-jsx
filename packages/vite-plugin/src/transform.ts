import * as babel from '@babel/core';
import BabelPreset from '@expressive/babel-preset';

export interface TransformResult {
  code: string;
  map: any;
  css: string;
}

export async function transform(id: string, input: string) {
  const result = await babel.transformAsync(input, {
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
      BabelPreset
    ]
  });

  if (!result)
    throw new Error("No result");

  let {
    code, map, metadata: { css }
  } = result as BabelPreset.Result;

  if (!code)
    throw new Error("No code");

  if (css)
    code += `\nimport "__EXPRESSIVE_CSS__";`;

  return <TransformResult>{
    code,
    css,
    map
  };
}
