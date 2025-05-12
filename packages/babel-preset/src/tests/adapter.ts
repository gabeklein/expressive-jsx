import { PluginItem, transformAsync } from '@babel/core';
import { format } from 'prettier';
import { expect } from 'vitest';

import Preset from '..';

// drop quotes from string snapshot
expect.addSnapshotSerializer({
  test: x => typeof x == "string",
  print: output => output as string
});

export type Styles = Record<string, Record<string, string>>;
export type Output = { code: string; css: string };

const defaultParser = createParser();

function parser(code: string): Promise<Output>;
function parser(options: Preset.Options, plugins?: PluginItem[]): (code: string) => Promise<Output>;
function parser(argument?: Preset.Options | string, plugins?: PluginItem[]){
  return typeof argument === 'string'
    ? defaultParser(argument)
    : createParser(argument, plugins);
}

function createParser(options?: Preset.Options, plugins?: PluginItem[]){
  return async function parse(source: string){
    const testName = expect.getState().currentTestName!;
    const filename = testName.replace(/ >.+/, "");
    const result = await transformAsync(source, {
      filename,
      plugins,
      cwd: "/",
      presets: [
        [Preset, options]
      ]
    });

    if(!result)
      throw new Error("No result from babel transform");

    const { css } = result.metadata as Preset.Meta;

    let code = format(result.code!, {
      singleQuote: true,
      trailingComma: "none",
      jsxBracketSameLine: true,
      printWidth: 65,
      parser: "babel"
    })

    code = code.replace(/\n$/gm, '');
    code = code.replace("const classNames = (...args) => args.filter(Boolean).join(' ');", "");

    return <Output> {
      css,
      code
    };
  }
}

export { parser }