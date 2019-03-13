import transformReactClass      from "@expressive/babel-plugin-react-class";
import transformReactXJS from "@expressive/babel-plugin-core";
import ExpressiveEnhancements   from "babel-preset-expressive-enhancements"

const WebStyles = require("@expressive/react-modifiers");

module.exports = options => {
    return {
        presets: [
            ExpressiveEnhancements
        ],
        plugins: [
            [transformReactClass, {
                activeOnMethodDo: true
            }],
            [transformReactXJS, {
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