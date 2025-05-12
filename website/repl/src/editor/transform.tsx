import * as Babel from '@babel/standalone';
import Preset from '@expressive/babel-preset';
import parserBabel from 'prettier/parser-babel';
import Prettier from 'prettier/standalone';

/** Generate preview JSX code from source. */
export function transform(input_jsx: string){
  const result = Babel.transform(input_jsx, {
    filename: '/REPL.js',
    presets: [Preset]
  });

  if(!result)  
    throw new Error("Failed to transform source.");

  let {
    code: jsx,
    metadata: { css }
  } = result as Preset.Result;

  try {
    jsx = Prettier.format(jsx, {
      parser: "babel",
      plugins: [ parserBabel ],
      singleQuote: false, 
      trailingComma: "none", 
      jsxBracketSameLine: true,
      tabWidth: 2,
      printWidth: 60
    });

    jsx = Object
      .values(transforms)
      .reduce((x, fx) => fx(x), jsx);
  }
  catch(err){
    throw new Error("Failed to prettify source.");
  }

  return { jsx, css };
}

const transforms: Record<string, (x: string) => string> = {
  statementLineSpacing: (x: string) =>
    x.replace(/^(.+?)\n(export|const|let)/gm, "$1\n\n$2"),

  jsxReturnSpacing: (x: string) =>
    x.replace(/^(.+?[^{])\n(\s+return (?=\(|<))/gm, "$1\n\n$2"),

  removeDoubleLines: (x: string) =>
    x.replace(/\n{3,}/g, "\n\n"),

  spaceOutBlocks: (x: string) =>
    x.replace(/([\t \r]*\n)([\)\}\]]+;?)([\t \r]*\n{1})(\s*[^\ni])/g, "$1$2$3\n$4"),

  spaceAfterImports: (x: string) =>
    x.replace(/(from ".+";?)([\t \r]*\n)([^\ni])/g, "$1$2\n$3"),

  tabCharactersMustDie: (x: string) =>
    x.replace(/\t/g, "  "),

  compactStylesInclude: (x: string) =>
    x.replace(/Styles\.include\(\n\s+`\n([^`]+)[^;]+;/g, "Styles.include(`\n$1`);"),

  ensureSpaceBeforeCSS: (x: string) =>
    x.replace(/(\n[\S\t ]+\n)(CSS\.put)/, "$1\n$2"),

  removeTrailingline: (x: string) =>
    x.replace(/\n$/, "")
};

export function hash(from: string){
  let hash = 0;
  for(let i = 0; i < from.length; i++)
    hash = ((hash << 5) - hash) + from.charCodeAt(i);
  return hash;
}
