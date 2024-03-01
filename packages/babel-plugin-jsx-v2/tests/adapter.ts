import { transformAsync } from '@babel/core';
import { format } from 'prettier';

import Plugin from '../src';

// forces babel to initialize saving time on first run
beforeAll(() => parser(`<div />`));

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

const defaultParser = createParser();

function parser(code: string): Promise<Output>;
function parser(options: Plugin.Options): (code: string) => Promise<Output>;
function parser(argument?: Plugin.Options | string){
  return typeof argument === 'string'
    ? defaultParser(argument)
    : createParser(argument);
}

function createParser(options?: Options){
  return async function parse(source: string){
    const styles: Styles = {};
    const result = await transformAsync(source, {
      filename: '/test.js',
      plugins: [
        [Plugin, <Plugin.Options>{
          polyfill: false,
          assign(name, value){
            const select = this.selector;
  
            const block = styles[select] || (styles[select] = {});

            block[name] = value;
          },
          ...options
        }]
      ]
    });

    const css = [];
    const code = format(result!.code!, {
      singleQuote: true,
      trailingComma: "none",
      jsxBracketSameLine: true,
      printWidth: 65,
      parser: "babel"
    }).replace(/\n$/gm, '');

    for(const selector in styles){
      const style = Object
        .entries(styles[selector])
        .map(([name, value]) => `  ${name}: ${value};`)
        .join("\n");

      css.push(selector + " {\n" + style + "\n}");
    }

    return <Output> {
      code,
      css: css.join("\n"),
      styles
    };
  }
}

export { parser }