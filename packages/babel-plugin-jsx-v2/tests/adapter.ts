import { transformAsync } from '@babel/core';
import { format } from 'prettier';

import Plugin from '../src';

// drop quotes from string snapshot
expect.addSnapshotSerializer({
  test: x => typeof x == "string",
  print: output => output as string
});

export type Options = Plugin.Options;
export type Styles = Record<string, Record<string, string>>;
export type Output = {
  code: string;
  styles: Styles;
  css: string
}

function parser(code: string): Promise<Output>;
function parser(options: Plugin.Options): (code: string) => Promise<Output>;
function parser(argument?: Plugin.Options | string){
  async function parse(source: string){
    const opts = typeof argument === 'object' && argument;
    const styles: Styles = {};

    const result = await transformAsync(source, {
      filename: '/test.js',
      plugins: [
        [Plugin, <Plugin.Options>{
          polyfill: false,
          assign(name, value){
            const className = `.${this.uid}`;
            const block = styles[className] || (styles[className] = {});

            block[name] = value;
          },
          ...opts
        }]
      ]
    });

    const code = format(result!.code!, {
      singleQuote: true,
      trailingComma: "none",
      jsxBracketSameLine: true,
      printWidth: 60,
      parser: "babel"
    }).replace(/\n$/gm, '');

    let css = "";

    for(const selector in styles){
      const style = Object
        .entries(styles[selector])
        .map(([name, value]) => `  ${name}: ${value};`);

      css += `${selector} {\n`;

      for(const line of style)
        css += line + "\n";

      css += "}";
    }

    return <Output> {
      code,
      css,
      styles
    };
  }

  if(typeof argument === 'string')
    return parse(argument);

  return parse;
}

export { parser }