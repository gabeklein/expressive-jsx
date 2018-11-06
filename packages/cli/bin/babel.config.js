
const NativeStyles = require("@expressive-react/modify-native");
const WebStyles = require("@expressive-react/modify-web");
const transformExpressiveReact = require("@expressive-react/babel-plugin-transform-xjs").default;
const inferReactComponent = require("@expressive-react/babel-plugin-auto-extends").default;
const expressiveEnhancements = require("babel-preset-expressive-enhancements");

const classProperties = require("@babel/plugin-syntax-class-properties");
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
        classProperties,
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