import { transformAsync } from '@babel/core';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { format } from 'prettier';

import Plugin from '../src';
import { DefineContext } from '../src/context';

const file = (path: string) => resolve(__dirname, path);
const CSS = new Map<DefineContext, Record<string, string>>();

async function stuff(){
  const source = await readFile(file("input.jsx"), "utf-8");
  const result = await transformAsync(source, {
    filename: '/REPL.js',
    plugins: [
      [Plugin, <Plugin.Options>{
        assign: assignStyle,
        macros: [{ absolute }]
      }]
    ]
  });

  const output = await format(result!.code!, {
    singleQuote: true,
    trailingComma: "none",
    jsxBracketSameLine: true,
    printWidth: process.stdout.columns,
    parser: "babel"
  });

  console.clear();
  console.log(output);
  console.log(generateCss());
}

function generateCss(){
  let css = "<style>\n";

  for(const [context, styles] of CSS){
    css += `  .${context.uid} {\n`;

    for(const [name, value] of Object.entries(styles))
      css += `    ${name}: ${value};\n`;
    
    css += "  }\n";
  }

  return css + "</style>\n";
}

function assignStyle(this: DefineContext, name: string, ...args: any[]){
  let styles = CSS.get(this);
  const output = args.length == 1 || typeof args[0] == "object"
    ? args[0] : Array.from(args).join(" ");

  if(!styles)
    CSS.set(this, styles = {});

  styles[name] = output;
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