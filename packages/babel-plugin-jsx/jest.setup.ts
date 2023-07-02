import { transform } from '@babel/core';
import { format } from 'prettier';
import PluginJSX from "./src";

expect.addSnapshotSerializer({
  test: input => typeof input == "string",
  print(content: unknown){
    let output = format(content as string, {
      singleQuote: false,
      trailingComma: "none",
      jsxBracketSameLine: true,
      printWidth: 60,
      parser: "babel"
    });
  
    Object.values(reformat).forEach(args => (
      output = output.replace(...args)
    ));
  
    return output;
  }
});

function transformJSX(input: string, options?: {}){
  return transform(input, {
    plugins: [
      [PluginJSX, {
        hot: false, 
        output: "jsx",
        printStyle: "pretty",
        externals: false,
        macros: [
          require("@expressive/macro-css")
        ],
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

const reformat: Record<string, [RegExp, string]> = {
  statementLineSpacing: [/^(.+?)\n(export|const|let)/gm, "$1\n\n$2"],
  jsxReturnSpacing: [/^(.+?[^{])\n(\s+return (?=\(|<))/gm, "$1\n\n$2"],
  removeDoubleLines: [/\n{3,}/g, "\n\n"],
  spaceOutBlocks: [/([\t \r]*\n)([\)\}\]]+;?)([\t \r]*\n{1})(\s*[^\ni])/g, "$1$2$3\n$4"],
  spaceAfterImports: [/^(from '.+";?)([\t \r]*\n)([^\ni])/g, "$1$2\n$3"],
  removeTrailingWhitespace: [/[\s\n]+$/, ""],
  indent: [/^/gm, "  "],
}