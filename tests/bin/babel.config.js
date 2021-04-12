const env = require("@babel/preset-env");
const transformExpressiveReact = require("../../packages/plugin-react");
const webstyleModifiers = require("../../packages/modify-style")
const gradientModifiers = require("../../packages/modify-gradient");
const pseudoModifiers = require("../../packages/modify-pseudo");

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
    [transformExpressiveReact, {
      hot: false, 
      output: TARGET,
      useImport: true, 
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