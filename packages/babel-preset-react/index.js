const css = require("@expressive/macro-css");

const DEV_MODE = process.env.NODE_ENV == "development";

module.exports = (compiler, options = {}) => {
  let {
    modifiers = [],
    hot = DEV_MODE,
    ...opts
  } = options;

  return {
    plugins: [
      ["@expressive/babel-plugin-jsx", {
        hot,
        output: "js",
        ...opts,
        modifiers: [
          css,
          ...modifiers
        ]
      }]
    ]
  }
}