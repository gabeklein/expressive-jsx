// TODO: Check if this is a better way to handle this.
// This fasciliates esModuleInterop .mjs does not select default export.
// "main" is defined as this file where "module" is "dist/index.js"
module.exports = require('./dist/index.js').default;
module.exports.default = module.exports;