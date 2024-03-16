import { transformAsync } from '@babel/core';
import { format } from 'prettier';

import Preset from '../src';

// forces babel to initialize saving time on first run
beforeAll(() => parser(`<div />`));

// drop quotes from string snapshot
expect.addSnapshotSerializer({
  test: x => typeof x == "string",
  print: output => output as string
});

export type Styles = Record<string, Record<string, string>>;
export type Output = { code: string; css: string };

const defaultParser = createParser();

function parser(code: string): Promise<Output>;
function parser(options: Preset.Options): (code: string) => Promise<Output>;
function parser(argument?: Preset.Options | string){
  return typeof argument === 'string'
    ? defaultParser(argument)
    : createParser(argument);
}

function createParser(options?: Preset.Options){
  return async function parse(source: string){
    const { currentTestName } = expect.getState();
    const result = await transformAsync(source, {
      filename: currentTestName,
      presets: [
        [Preset, <Preset.Options>{
          polyfill: null,
          ...options
        }]
      ]
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

    return <Output> {
      css,
      code
    };
  }
}

export { parser }