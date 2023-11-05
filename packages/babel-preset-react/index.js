const JSX = require("@expressive/babel-plugin-jsx");
const CSS = require("./macros");

const Preset = (_compiler, options = {}) => {
  let { macros = [], output = "js", ...opts } = options;

  return {
    plugins: [
      [JSX, {
        ...opts,
        output,
        macros: [
          CSS,
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
