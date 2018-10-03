#!/usr/bin/env node

//required first as commands may trigger an exit
const program = require("./console");

const gulp = require("gulp");
const babel = require("gulp-babel");
const replace = require('gulp-replace');
const prettier = require("gulp-prettier");

const statementLineSpacing = () =>
    replace(/^(.+?)\n(export|const|let)/gm, "$1\n\n$2")

const jsxReturnSpacing = () =>
    replace(/^(.+?[^{])\n(\s+return (?=\(|<))/gm, "$1\n\n$2")

const prettier_config = { singleQuote: true, trailingComma: "es5", jsxBracketSameLine: true };
const babel_config = require("./babel.config");
      babel_config.babelrc = false

const {
    watch: shouldWatch,
    args: [ inputDir ],
    out: outDir
} = program;

let source = inputDir.replace(/\/$/, "") + "/**/*.js";
let exclude_modules = "!" + inputDir.replace(/\/$/, "") + "/node_modules/**";
let output = outDir.replace(/\/$/, "");

function onFault(a){
    console.log(`\nError on file: ${a.fileName}\n`)
    console.error(a.stack)
}

function onDone(a, b){
    console.log("Compiled Successfully")
}

gulp.task('onChange', () => {
    console.log("File Changed!")
})

gulp.task('xjs', () => {
    gulp.src([source, exclude_modules])
        .pipe(babel(babel_config))
        .on('error', onFault)
        .pipe(prettier(prettier_config))
        .pipe(statementLineSpacing())
        .pipe(jsxReturnSpacing())
        .on('end', onDone)
        .pipe(gulp.dest(output));
});

gulp.task("watch", () => {
    console.log(`Watching for changes in ${source} files...`)
    gulp.watch(source, ['onChange', 'xjs']);
})

const tasks = ["xjs"];

if(shouldWatch)
    tasks.push("watch")

gulp.start(tasks);