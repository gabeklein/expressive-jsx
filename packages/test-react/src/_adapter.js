const BabelPluginReact = require("@expressive/babel-plugin-jsx");
const webstyleMacros = require("@expressive/macro-styles")
const pseudoMacros = require("@expressive/macro-pseudo")

const { expect, test } = require("@jest/globals")
const { transformAsync } = require("@babel/core");

async function transform(source, opts){
  const result = await transformAsync(source, {
    plugins: [
      [BabelPluginReact, {
        hot: false,
        externals: false,
        modifiers: [
          webstyleMacros,
          pseudoMacros
        ],
        ...opts
      }]
    ]
  });

  return result && result.code;
}

function run(name, code){
  test(name, async () => {
    const [ jsx, js ] = await Promise.all([
      transform(code, { output: "jsx" }),
      transform(code, { output: "js" })
    ]);
  
    expect(js).toMatchSnapshot();
    expect(jsx).toMatchSnapshot();
  })
}

module.exports = run;
