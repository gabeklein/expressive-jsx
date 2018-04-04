import inferReactComponent      from "babel-plugin-implicit-react-class";
import transformExpressiveLoops from "babel-plugin-transform-expressive-loops";
import transformExpressiveReact from "babel-plugin-transform-expressive-react";

const WebStyles = require("expressive-react-web-styles");

module.exports = options => {
    return {
        plugins: [
            [inferReactComponent, {
                activeOnMethodDo: true
            }],
            transformExpressiveLoops,
            [transformExpressiveReact, {
                reactEnv: "next",
                modifiers: [
                    WebStyles
                ]
            }],
        ]
    }
}