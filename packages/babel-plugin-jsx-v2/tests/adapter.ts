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
    const css = [] as string[];
    const used = new Set<Plugin.DefineContext>();
    const result = await transformAsync(source, {
      filename: expect.getState().currentTestName,
      plugins: [
        [Plugin, <Plugin.Options>{
          polyfill: false,
          apply(element){
            const using = new Set(element.using);

            using.forEach(context => {
              used.add(context);
              context.dependant.forEach(x => using.add(x));
            });
          },
          ...options
        }]
      ]
    });

    for(const context of used){
      if(!Object.keys(context.styles).length)
        continue;

      const styles = [] as string[];

      for(const [name, value] of Object.entries(context.styles))
        styles.push(`  ${name}: ${value};`);

      css.push(context.selector + " {\n" + styles.join("\n") + "\n}");
    }

    return <Output> {
      css: css.join("\n"),
      code: format(result!.code!, {
        singleQuote: true,
        trailingComma: "none",
        jsxBracketSameLine: true,
        printWidth: 65,
        parser: "babel"
      }).replace(/\n$/gm, '')
    };
  }
}

export { parser }