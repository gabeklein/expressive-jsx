
const program = require("commander");
const { version } = require('../package.json');

module.exports = program
    .version(version)
    .usage('[options] <file ...>')
    .option('-n --native', "Set compiler mode to react native")
    .option('-w --watch', "Watch directory and convert on change")
    .option('-o --out-dir [value]', "Directory of output")
    .parse(process.argv);