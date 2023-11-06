import { transformAsync } from '@babel/core';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

import Preset from '..';

const file = (path: string) => resolve(__dirname, path);

async function stuff(){
  const source = await readFile(file("input.jsx"), "utf-8");

  let css = "";
  const result = await transformAsync(source, {
    filename: '/REPL.js',
    presets: [
      [Preset, {
        hot: false,
        output: "jsx",
        cssModule: false,
        printStyle: "pretty",
        extractCss(text: string){
          css = text;
        }
      }]
    ]
  });

  const output = result!.code!;

  console.log("\n" + output + "\n");
  console.log(css.replace(/\t/g, "  "));
}

stuff();