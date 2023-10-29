const css = require("@expressive/macro-css");
const plugin = require("@expressive/babel-plugin-jsx");

const Preset = (_compiler, options = {}) => {
  let {
    macros = [],
    ...opts
  } = options;

  return {
    plugins: [
      [plugin, {
        output: "js",
        ...opts,
        macros: [
          css,
          ...macros
        ]
      }]
    ]
  }
}

module.exports = Preset;

Object.defineProperty(module.exports, "default", {
  enumerable: true,
  get: () => Preset
});

Object.defineProperty(module.exports, "__esModule", {
  value: true
});
