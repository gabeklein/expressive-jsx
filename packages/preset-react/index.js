const PluginReact = require("@expressive/babel-plugin-react")
const WebStyles = require("@expressive/react-modifiers");

module.exports = (compiler, options = {}) => {
  let modifiers = [ WebStyles ].concat(options.modifiers || []);

  return {
    plugins: [
      [PluginReact, {
        reactEnv: "web",
        output: "js",
        modifiers
      }]
    ]
  }
}