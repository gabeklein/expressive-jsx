import * as babel from '@babel/core';
import BabelPreset from '@expressive/babel-preset';

export type TransformOptions = BabelPreset.Options;

export interface TransformResult {
  code: string;
  map: any;
  css: string;
}

export async function transform(
  id: string,
  input: string,
  presetOptions: BabelPreset.Options = {}
): Promise<TransformResult> {
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
      [BabelPreset, presetOptions]
    ]
  });

  if (!result)
    throw new Error("No result");

  let {
    code,
    map,
    metadata: { css }
  } = result as BabelPreset.Result;

  if (!code)
    throw new Error("No code");

  return <TransformResult> {
    code,
    css,
    map
  };
}
