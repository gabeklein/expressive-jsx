const { expect, test } = require("@jest/globals")
const { transformAsync } = require("@babel/core");
const webstyleModifiers = require("@expressive/modify-style")
const pseudoModifiers = require("@expressive/modify-pseudo")
const ThisPlugin = require("../src").default;

async function transform(source, opts){
  const result = await transformAsync(source, {
    plugins: [
      [ThisPlugin, {
        hot: false,
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

function compiles(name, code){
  test(name, async () => {
    const [ jsx, js ] = await Promise.all([
      transform(code, { output: "jsx" }),
      transform(code, { output: "js" })
    ]);
  
    expect(js).toMatchSnapshot();
    expect(jsx).toMatchSnapshot();
  })
}

module.exports = compiles;
