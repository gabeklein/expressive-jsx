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

function transformToJSX(code, opts){
  return transform(code, {
    printStyle: "pretty",
    output: "jsx"
  })
}

function transformToJS(code, opts){
  return transform(code, {
    printStyle: "pretty",
    output: "js"
  })
}

function transformBoth(code, opts){
  const jsx = transformToJSX(code, opts);
  const js = transformToJS(code, opts);

  return Promise.all([js, jsx]).then(output => {
    const [ js, jsx ] = output;
    return { js, jsx };
  })
}

module.exports = {
  transform,
  run: transformBoth,
  jsx: transformToJSX,
  js: transformToJS
}
