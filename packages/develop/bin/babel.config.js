const env = require("@babel/preset-env");

const BabelPluginReact = require("@expressive/babel-plugin-jsx");
const webstyleMacros = require("@expressive/macro-style");
const pseudoMacros = require("@expressive/macro-pseudo");
const gradientMacros = require("@expressive/macro-gradient");

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
        webstyleMacros,
        gradientMacros,
        pseudoMacros
      ]
    }]
  ]
}