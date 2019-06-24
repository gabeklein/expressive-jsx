
const WebStyles = require("@expressive/react-modifiers");
const transformExpressiveReact = require("@expressive/babel-plugin-react");
const inferReactComponent = require("@expressive/babel-plugin-react-class").default;
const expressiveEnhancements = require("babel-preset-expressive-enhancements");

const syntaxClassProperties = require("@babel/plugin-syntax-class-properties");
const pluginClassProperties = require("@babel/plugin-proposal-class-properties");

const transformRuntime = require("@babel/plugin-transform-runtime")

const restSpread = require("@babel/plugin-proposal-object-rest-spread");
const env = require("@babel/preset-env");

const path = require("path")

const program = require("./console");

module.exports = {
    "presets": [
        [env, {
          "modules": false
        }],
        expressiveEnhancements,        
    ],
    "plugins": [
        syntaxClassProperties,
        [inferReactComponent, {
            activeOnMethodDo: true
        }],
        [transformRuntime, {
            corejs: false,
            helpers: true,
            regenerator: true,
            useESModules: false
        }],
        [transformExpressiveReact, {
            reactEnv: "next",
            output: program.jsx ? "jsx" : "js",
            useRequire: program.useRequire,
            useImport: program.useImport, 
            modifiers: [
                WebStyles
            ]
        }]
    ]
}