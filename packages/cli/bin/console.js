const program = require("commander");
const { version } = require('../package.json');

module.exports = program
    .version(version)
    .usage('[options] <file ...>')
    .option('-n --native', "Set compiler mode to react native")
    .option('-w --watch', "Watch directory and convert on change")
    .option('-o --out [value]', "Directory of output")
    .option('--jsx', "Output transformed code as JSX")
    .option('--use-require', "Use require() for automatic imports. [default]")
    .option('--use-import', "Use ES6 `import` for automatic imports. [default with --jsx]")
    .parse(process.argv);