import transformExpressiveReact from "@expressive-react/plugin-transform-xjs";
import inferReactComponent      from "@expressive-react/plugin-auto-extends";
import ExpressiveEnhancements from "babel-preset-expressive-enhancements"

const NativeStyles = require("@expressive-react/modify-native");

const Plugins = require("babel-preset-react-native/plugins")

function plugin(name) {
    const imported = Plugins[`babel-plugin-${name}`]
    return imported.default || imported;
}

module.exports = options => {
    return {
        presets: [
            ExpressiveEnhancements
        ],
        plugins: [

            plugin('syntax-trailing-function-commas'),
            plugin('transform-es2015-block-scoping'),
            plugin('transform-es2015-computed-properties'),
            plugin('transform-es2015-destructuring'),
            plugin('transform-es2015-function-name'),
            plugin('transform-es2015-literals'),
            plugin('transform-es2015-shorthand-properties'),
            plugin('transform-flow-strip-types'),
            plugin('transform-react-jsx'),
            plugin('transform-regenerator'),
            [
              plugin('transform-es2015-modules-commonjs'),
              {strict: false, allowTopLevelThis: true},
            ],
            plugin('transform-es2015-parameters'),
            plugin('transform-class-properties'),
            plugin('syntax-async-functions'),
            plugin('transform-es2015-arrow-functions'),
            plugin('check-es2015-constants'),
            plugin('transform-es2015-spread'),
            plugin('transform-object-rest-spread'),
            plugin('transform-es2015-template-literals'),
            plugin('transform-object-assign'),
            
            
            [inferReactComponent, {
                activeOnMethodDo: true
            }],
            [transformExpressiveReact, {
                reactEnv: "native",
                modifiers: [
                    NativeStyles
                ]
            }],

            plugin('transform-es2015-classes'),
            
            // plugin('transform-react-display-name'),
            // plugin('transform-react-jsx-source')
        ]
    }
}