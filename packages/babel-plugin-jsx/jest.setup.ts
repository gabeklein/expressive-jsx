import { transform } from '@babel/core';
import { format } from 'prettier';
import PluginJSX from "./src";

expect.addSnapshotSerializer({
  test: () => true,
  print(content){
    const built = transform(content as string, {
      plugins: [
        [PluginJSX, {
          hot: false, 
          output: "jsx",
          printStyle: "pretty",
          externals: false,
          macros: [
            require("@expressive/macro-css")
          ]
        }]
      ]
    })!;
  
    let output = format(built.code as string, {
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

const test: any = (name: string, code: string) => {
  it(name, () => {
    expect(code).toMatchSnapshot();
  });
}

test.only = (name: string, code: string) => {
  it.only(name, () => {
    expect(code).toMatchSnapshot();
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