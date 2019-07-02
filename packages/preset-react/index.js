const PluginReact = require("@expressive/babel-plugin-react")
const WebStyles = require("@expressive/modify-style");

module.exports = (compiler, options = {}) => {
  let { modifiers, ...opts } = options;
  modifiers = [ WebStyles ].concat(modifiers || []);

  return {
    plugins: [
      [PluginReact, {
        reactEnv: "web",
        output: "js",
        modifiers,
        ...opts
      }]
    ]
  }
}