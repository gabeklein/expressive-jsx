const env = require("@babel/preset-env");

const BabelPluginReact = require("@expressive/babel-plugin-jsx");
const webstyleMacros = require("@expressive/macro-css");
const pseudoMacros = require("@expressive/macro-pseudo");
const gradientMacros = require("@expressive/macro-gradient");
const classProperties = require("@babel/plugin-syntax-class-properties");

const { 
  TARGET = "jsx"
} = process.env;

module.exports = {
  comments: false,
  presets: [
    [env, {
      "targets": {
        node: "current"
      },
      modules: false
    }]
  ],
  plugins: [
    classProperties,
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