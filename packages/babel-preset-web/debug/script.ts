import { transformAsync } from '@babel/core';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { format } from 'prettier';

import Preset from '../src';

async function transform(){
  const input = resolve(__dirname, "input.jsx");
  const source = await readFile(input, "utf-8");
  const result = await transformAsync(source, {
    filename: '/REPL.js',
    presets: [
      [Preset, <Preset.Options>{
        polyfill: null
      }]
    ]
  });

  if(!result)
    throw new Error("No result from babel transform");

  const { css } = result.metadata as Preset.Meta;
  const output = format(result.code!, {
    singleQuote: true,
    trailingComma: "none",
    jsxBracketSameLine: true,
    printWidth: process.stdout.columns,
    parser: "babel"
  });

  console.clear();
  console.log(output);

  if(css)
    console.log(
      `<style>\n${
        css.replace(/^(.)/gm, "  $1")
      }\n</style>\n`
    );
}

transform();