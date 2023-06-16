import { transform } from "@babel/core";
import fs from "fs";
import { resolve } from "path";
import { format } from "prettier";

const file = resolve("./tests/input.js");
const outFile = resolve("./tests/output.js");

let last = "";

function check(){
  const content = fs.readFileSync(file, "utf8");

  if(content !== last)
    build(last = content);
}

function build(content: string){
  try {
    const built = transform(content, {
      plugins: [
        [require("../src/index.ts"), {
          hot: false, 
          output: "jsx",
          printStyle: "pretty",
          modifiers: [
            require("@expressive/macro-css"),
            require("@expressive/macro-gradient")
          ]
        }]
      ]
    })!;

    const output = [
      prettier,
      statementLineSpacing,
      jsxReturnSpacing,
      removeDoubleLines,
      spaceOutBlocks,
      spaceAfterImports
    ].reduce(
      (code, transform) => transform(code),
      built.code as string
    );
  
    fs.writeFileSync(outFile, output, {
      encoding: "utf8"
    });
    
    console.log("Built.");
  }
  catch(err){    
    console.error(err);
    console.log("Build failed.");
  }
}

const prettier = (input: string) => format(input, {
  singleQuote: false,
  trailingComma: "none",
  jsxBracketSameLine: true,
  printWidth: 60,
  parser: "babel"
})

const statementLineSpacing = (input: string) =>
  input.replace(/^(.+?)\n(export|const|let)/gm, "$1\n\n$2")

const jsxReturnSpacing = (input: string) =>
  input.replace(/^(.+?[^{])\n(\s+return (?=\(|<))/gm, "$1\n\n$2")

const removeDoubleLines = (input: string) =>
  input.replace(/\n{3,}/g, "\n\n")

const spaceOutBlocks = (input: string) =>
  input.replace(/([\t \r]*\n)([\)\}\]]+;?)([\t \r]*\n{1})(\s*[^\ni])/g, "$1$2$3\n$4")

const spaceAfterImports = (input: string) =>
  input.replace(/(from '.+";?)([\t \r]*\n)([^\ni])/g, "$1$2\n$3");

fs.watch(file, check);
check();