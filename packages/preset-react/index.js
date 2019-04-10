const PluginEnhance = require("babel-preset-expressive-enhancements").default;
const PluginReactClass = require("@expressive/babel-plugin-react-class").default;
const PluginReact = require("@expressive/babel-plugin-react")
const WebStyles = require("@expressive/react-modifiers");

module.exports = function(options){
    return {
        presets: [
            PluginEnhance
        ],
        plugins: [
            [PluginReactClass, {
                activeOnMethodDo: true
            }],
            [PluginReact, {
                reactEnv: "web",
                output: "es6",
                styleMode: "compile",
                modifiers: [
                    WebStyles
                ]
            }],
        ]
    }
}