import { transformAsync } from '@babel/core';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { format } from 'prettier';

import Plugin from '../src';
import { DefineContext } from '../src/context';

const file = (path: string) => resolve(__dirname, path);

async function stuff(){
  const css = [] as string[];
  const used = new Set<Plugin.DefineContext>();
  const source = await readFile(file("input.jsx"), "utf-8");
  const result = await transformAsync(source, {
    filename: '/REPL.js',
    plugins: [
      [Plugin, <Plugin.Options>{
        apply(element){
          const using = new Set(element.using);

          using.forEach(context => {
            used.add(context);
            context.dependant.forEach(x => using.add(x));
          });
        },
        polyfill: false,
        macros: [{ absolute }]
      }]
    ]
  });

  const output = format(result!.code!, {
    singleQuote: true,
    trailingComma: "none",
    jsxBracketSameLine: true,
    printWidth: process.stdout.columns,
    parser: "babel"
  });

  for(const context of used){
    if(!Object.keys(context.styles).length)
      continue;

    const styles = [] as string[];

    for(const [name, value] of Object.entries(context.styles))
      styles.push(`    ${name}: ${value};`);

    css.push(context.selector + " {\n" + styles.join("\n") + "\n  }");
  }

  console.clear();
  console.log(output);
  console.log("<style>\n  " + css.join("\n  ") + "\n</style>\n");
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