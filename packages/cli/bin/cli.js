#!/usr/bin/env node

//required first as commands may trigger an exit
const program = require("./console");

const gulp = require("gulp");
const babel = require("gulp-babel");
const prettier = require("gulp-prettier");

const prettier_config = { singleQuote: true };
const babel_config = require("./babel.config");

babel_config.babelrc = false

const {
    watch: shouldWatch,
    args: [ inputDir ],
    outDir
} = program;

let source = inputDir.replace(/\/$/, "") + "/**/*.js";
let output = outDir.replace(/\/$/, "");

function onFault(){
    console.error(...arguments)
}

gulp.task('xjs', () => {
    gulp.src(source)
        .pipe(babel(babel_config))
        .on('error', onFault)
        .pipe(prettier(prettier_config))
        .pipe(gulp.dest(output));
});

if(shouldWatch)
    gulp.watch(source, ['xjs']);

gulp.start('xjs');
