import { transform } from '@babel/core';
import PresetReact from './src';

const { format } = require("prettier");

const FORMAT: Record<string, [RegExp, string]> = {
  statementLineSpacing: [/^(.+?)\n(export|const|let)/gm, "$1\n\n$2"],
  jsxReturnSpacing: [/^(.+?[^{])\n(\s+return (?=\(|<))/gm, "$1\n\n$2"],
  removeDoubleLines: [/\n{3,}/g, "\n\n"],
  spaceOutBlocks: [/([\t \r]*\n)([\)\}\]]+;?)([\t \r]*\n{1})(\s*[^\ni])/g, "$1$2$3\n$4"],
  spaceAfterImports: [/^(from '.+";?)([\t \r]*\n)([^\ni])/g, "$1$2\n$3"],
  removeTrailingWhitespace: [/[\s\n]+$/, ""],
  indent: [/^/gm, "  "],
}

expect.addSnapshotSerializer({
  test: input => typeof input == "string",
  print(content: unknown){
    let output: string = format(content as string, {
      singleQuote: false,
      trailingComma: "none",
      jsxBracketSameLine: true,
      printWidth: 60,
      parser: "babel"
    });

    Object.values(FORMAT).forEach(args => (
      output = output.replace(...args)
    ));
  
    return output;
  }
});

function transformJSX(input: string, options?: {}){
  return transform(input, {
    presets: [
      [PresetReact, {
        hot: false, 
        output: "jsx",
        printStyle: "pretty",
        externals: false,
        ...options
      }]
    ]
  })!.code;
}

const test: any = (name: string, code: string, options?: {}) => {
  it(name, () => {
    expect(transformJSX(code, options)).toMatchSnapshot();
  });
}

test.only = (name: string, code: string, options?: {}) => {
  it.only(name, () => {
    expect(transformJSX(code, options)).toMatchSnapshot();
  });
}

test.skip = (name: string, code: string) => {
  it.skip(name, () => void code);
}

(global as any).transform = test;