import { transform } from '@babel/core';
import { format } from 'prettier';

expect.addSnapshotSerializer({
  test: () => true,
  print
})

const replacements = <const>{
  statementLineSpacing: [/^(.+?)\n(export|const|let)/gm, "$1\n\n$2"],
  jsxReturnSpacing: [/^(.+?[^{])\n(\s+return (?=\(|<))/gm, "$1\n\n$2"],
  removeDoubleLines: [/\n{3,}/g, "\n\n"],
  spaceOutBlocks: [/([\t \r]*\n)([\)\}\]]+;?)([\t \r]*\n{1})(\s*[^\ni])/g, "$1$2$3\n$4"],
  spaceAfterImports: [/^(from '.+";?)([\t \r]*\n)([^\ni])/g, "$1$2\n$3"],
  indent: [/^/gm, "  "],
  removeTrailingWhitespace: [/[\s\n]+$/, ""],
}

function print(content: unknown){
  const built = transform(content as string, {
    plugins: [
      ["@expressive/babel-plugin-jsx", {
        hot: false, 
        output: "jsx",
        printStyle: "pretty",
        externals: false,
        modifiers: [
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

  Object.values(replacements).forEach(([regex, replace]) => (
    output = output.replace(regex, replace)
  ));

  return output;
}

(global as any).transform = (name: string, code: string) => {
  it(name, () => {
    expect(code).toMatchSnapshot();
  });
}