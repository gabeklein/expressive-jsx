const css = require("@expressive/macro-css");
const plugin = require("@expressive/babel-plugin-jsx");

module.exports = (_compiler, options = {}) => {
  let {
    macros = [],
    ...opts
  } = options;

  return {
    plugins: [
      [plugin, {
        output: "js",
        ...opts,
        macros: [
          css,
          ...macros
        ]
      }]
    ]
  }
}