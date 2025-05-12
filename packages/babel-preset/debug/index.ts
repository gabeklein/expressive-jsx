import { transformAsync } from '@babel/core';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { format } from 'prettier';

import { Preset } from '../src';

export async function parse(
  input: string = "./input.jsx",
  output?: string): Promise<string> {

  input = resolve(__dirname, input);
  output = output ? resolve(__dirname, output) : undefined;

  const contents = await readFile(input, "utf-8");
  const result = await transformAsync(contents, {
    filename: input,
    cwd: "/",
    presets: [Preset]
  });

  if(!result)
    throw new Error("No result from babel transform");

  const { css } = result.metadata as Preset.Meta;

  const code = format(result.code!, {
    singleQuote: true,
    trailingComma: "none",
    jsxBracketSameLine: true,
    printWidth: 65,
    parser: "babel"
  }).replace(/\n$/gm, '');

  if(output)
    await Promise.all([
      writeFile(output!, code),
      writeFile(output!.replace(/\.jsx$/, ".css"), css)
    ]);

  return code + "\n" + css;
}

if (require.main === module)
  parse("./input.jsx", "./output.jsx")