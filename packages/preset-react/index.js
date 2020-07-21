const PluginReact = require("@expressive/babel-plugin-react");
const styleModifiers = require("@expressive/modify-style");

module.exports = (compiler, options = {}) => {
  let { modifiers = [], ...opts } = options;

  return {
    plugins: [
      [PluginReact, {
        reactEnv: "web",
        output: "js",
        modifiers: [
          ...styleModifiers,
          ...modifiers
        ],
        ...opts
      }]
    ]
  }
}