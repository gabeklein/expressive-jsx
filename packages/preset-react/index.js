const PluginReact = require("@expressive/babel-plugin-react");
const styleModifiers = require("@expressive/modify-style");

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
        reactEnv: "web",
        output: "js",
        modifiers: [
          styleModifiers,
          ...modifiers
        ],
        ...opts
      }]
    ]
  }
}