const PluginReact = require("@expressive/babel-plugin-react");
const styleModifiers = require("@expressive/modify-style");
const pseudoModifiers = require("@expressive/modify-pseudo");

const { NODE_ENV } = process.env;

module.exports = (compiler, options = {}) => {
  let {
    modifiers = [],
    hot = NODE_ENV == "development",
    ...opts
  } = options;

  return {
    plugins: [
      [PluginReact, {
        hot,
        output: "js",
        ...opts,
        modifiers: [
          styleModifiers,
          pseudoModifiers,
          ...modifiers
        ]
      }]
    ]
  }
}