import inferReactComponent      from "@expressive-react/babel-plugin-auto-extends";
import transformExpressiveReact from "@expressive-react/babel-plugin-transform-xjs";
import ExpressiveEnhancements   from "babel-preset-expressive-enhancements"

const WebStyles = require("@expressive-react/modify-web");

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
            }],
        ]
    }
}