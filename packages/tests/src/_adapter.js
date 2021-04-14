const BabelPluginReact = require("@expressive/babel-plugin-react");
const webstyleModifiers = require("@expressive/modify-style")
const pseudoModifiers = require("@expressive/modify-pseudo")

const { expect, test } = require("@jest/globals")
const { transformAsync } = require("@babel/core");

async function transform(source, opts){
  const result = await transformAsync(source, {
    plugins: [
      [BabelPluginReact, {
        hot: false,
        externals: false,
        modifiers: [
          webstyleModifiers,
          pseudoModifiers
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