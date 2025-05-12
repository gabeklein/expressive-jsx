import * as babel from "@babel/core";
import BabelPreset from "@expressive/babel-preset";

export type TransformOptions = BabelPreset.Options;

export async function transform(
  id: string,
  input: string,
  options: BabelPreset.Options = {}
) {
  const result = await babel.transformAsync(input, {
    root: process.cwd(),
    filename: id,
    sourceFileName: id.split("?")[0],
    sourceMaps: true,
    parserOpts: {
      sourceType: "module",
      allowAwaitOutsideFunction: true,
    },
    generatorOpts: {
      decoratorsBeforeExport: true,
    },
    presets: [[BabelPreset, options]],
  });

  if (!result) throw new Error("No result");

  let {
    code,
    map,
    metadata: { css },
  } = result as BabelPreset.Result;

  if (!code) throw new Error("No code");

  return { code, css, map };
}
