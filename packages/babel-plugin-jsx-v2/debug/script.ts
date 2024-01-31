import { transformAsync } from '@babel/core';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

import Plugin from '../src';

const file = (path: string) => resolve(__dirname, path);

async function stuff(){
  const source = await readFile(file("input.jsx"), "utf-8");

  const result = await transformAsync(source, {
    filename: '/REPL.js',
    plugins: [
      [Plugin, {
        macros: [{
          absolute
        }]
      }]
    ]
  });

  const output = result!.code!;

  console.log("\n" + output + "\n");
}

function absolute(offset: number){
  return {
    position: "absolute",
    top: offset,
    left: offset,
    right: offset,
    bottom: offset
  }
}

stuff();