const PluginReact = require("@expressive/babel-plugin-jsx");
const styleMacros = require("@expressive/macro-style");
const pseudoMacros = require("@expressive/macro-pseudo");

const { NODE_ENV } = process.env;
const DEV_MODE = NODE_ENV == "development";

module.exports = (compiler, options = {}) => {
  let {
    modifiers = [],
    hot = DEV_MODE,
    ...opts
  } = options;

  return {
    plugins: [
      [PluginReact, {
        hot,
        output: "js",
        ...opts,
        modifiers: [
          styleMacros,
          pseudoMacros,
          ...modifiers
        ]
      }]
    ]
  }
}