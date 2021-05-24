const env = require("@babel/preset-env");

const BabelPluginReact = require("@expressive/babel-plugin-react");
const webstyleModifiers = require("@expressive/modify-style");
const pseudoModifiers = require("@expressive/modify-pseudo");
const gradientModifiers = require("@expressive/modify-gradient");

const { 
  TARGET = "jsx"
} = process.env;

module.exports = {
  presets: [
    [env, {
      "targets": {
          node: "current"
      },
      modules: false
    }]
  ],
  plugins: [
    [BabelPluginReact, {
      hot: false, 
      output: TARGET,
      printStyle: "pretty",
      // styleMode: "inline",
      modifiers: [
        webstyleModifiers,
        gradientModifiers,
        pseudoModifiers
      ]
    }]
  ]
}