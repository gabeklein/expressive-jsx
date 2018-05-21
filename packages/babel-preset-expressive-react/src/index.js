import inferReactComponent      from "babel-plugin-implicit-react-class";
// import transformExpressiveLoops from "babel-plugin-transform-expressive-loops";
// import transformInIterable      from "babel-plugin-transform-in-iterable";
import transformExpressiveReact from "babel-plugin-transform-expressive-react";
import ExpressiveEnhancements from "babel-preset-expressive-enhancements"

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
                applicationType: "native"
            }],
        ]
    }
}