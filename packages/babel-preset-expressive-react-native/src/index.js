import transformExpressiveLoops from "babel-plugin-transform-expressive-loops";
import transformExpressiveReact from "babel-plugin-transform-expressive-react";
import inferReactComponent      from "babel-plugin-infer-extends-component";

const Plugins = require("babel-preset-react-native/plugins")

function plugin(name) {
    const imported = Plugins[`babel-plugin-${name}`]
    return imported.default || imported;
}

module.exports = options => {
    return {
        plugins: [

            plugin('syntax-class-properties'),
            plugin('syntax-trailing-function-commas'),
            plugin('transform-class-properties'),
            plugin('transform-es2015-block-scoping'),
            plugin('transform-es2015-computed-properties'),
            plugin('transform-es2015-destructuring'),
            plugin('transform-es2015-function-name'),
            plugin('transform-es2015-literals'),
            plugin('transform-es2015-parameters'),
            plugin('transform-es2015-shorthand-properties'),
            plugin('transform-flow-strip-types'),
            plugin('transform-react-jsx'),
            plugin('transform-regenerator'),
            [
              plugin('transform-es2015-modules-commonjs'),
              {strict: false, allowTopLevelThis: true},
            ],
            
            [inferReactComponent, {
                activeOnMethodDo: true
            }],
            transformExpressiveReact,
            transformExpressiveLoops,

            plugin('syntax-async-functions'),
            plugin('transform-es2015-classes'),
            plugin('transform-es2015-arrow-functions'),
            plugin('check-es2015-constants'),
            plugin('transform-es2015-spread'),
            plugin('transform-object-rest-spread'),
            plugin('transform-es2015-template-literals'),
            plugin('transform-object-assign'),
            plugin('transform-react-display-name'),
            plugin('transform-react-jsx-source')
        ]
    }
}