
const NativeStyles = require("@expressive/react-native-modifiers");
const WebStyles = require("@expressive/react-modifiers");
const transformExpressiveReact = require("@expressive/babel-plugin-react-xjs").default;
const inferReactComponent = require("@expressive/babel-plugin-react-class").default;
const expressiveEnhancements = require("babel-preset-expressive-enhancements");

const syntaxClassProperties = require("@babel/plugin-syntax-class-properties");
const pluginClassProperties = require("@babel/plugin-proposal-class-properties");

const restSpread = require("@babel/plugin-proposal-object-rest-spread");
const env = require("@babel/preset-env");

const path = require("path")

const program = require("./console");

module.exports = {
    "presets": [
        [env, {
          "targets": {
            "node": "current"
          },
          "modules": false
        }],
        expressiveEnhancements,        
    ],
    "plugins": [
        pluginClassProperties,
        restSpread,
        [inferReactComponent, {
            activeOnMethodDo: true
        }],
        [transformExpressiveReact, {
            reactEnv: "next",
            output: "JSX",
            styleMode: "compile",
            modifiers: [
                WebStyles
            ]
        }]
    ]
}