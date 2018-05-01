import inferReactComponent      from "babel-plugin-implicit-react-class";
import transformExpressiveLoops from "babel-plugin-transform-expressive-loops";
import transformExpressiveReact from "babel-plugin-transform-expressive-react";
import transformInIterable      from "babel-plugin-transform-in-iterable";

const WebStyles = require("expressive-react-web-styles");

module.exports = options => {
    return {
        plugins: [
            [inferReactComponent, {
                activeOnMethodDo: true
            }],
            transformExpressiveLoops,
            transformInIterable,
            [transformExpressiveReact, {
                reactEnv: "next",
                modifiers: [
                    WebStyles
                ]
            }]
        ]
    }
}