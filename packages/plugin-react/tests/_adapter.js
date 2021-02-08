const { expect, test } = require("@jest/globals")
const { transformAsync } = require("@babel/core");
const webstyleModifiers = require("@expressive/modify-style")
const { default: ThisPlugin } = require("../src");

async function transform(source, pluginOpts){
  const result = await transformAsync(source, {
    plugins: [
      [ThisPlugin, {
        hot: false,
        modifiers: [ webstyleModifiers ],
        ...pluginOpts
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
