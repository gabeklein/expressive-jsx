import inferReactComponent      from "babel-plugin-implicit-react-class";
import transformExpressiveReact from "babel-plugin-transform-expressive-react";
import ExpressiveEnhancements from "babel-preset-expressive-enhancements"

const WebStyles = require("expressive-react-web-styles");

module.exports = options => {
    return {
        presets: [
            ExpressiveEnhancements
        ],
        plugins: [
            [inferReactComponent, {
                activeOnMethodDo: true
            }],
            [transformExpressiveReact, {
                reactEnv: "next",
                modifiers: [
                    WebStyles
                ]
            }]
        ]
    }
}