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

const prettier_config = { 
    singleQuote: true, 
    trailingComma: "es5", 
    jsxBracketSameLine: true,
    printWidth: 40
};
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
    let [error, ...trace] = a.stack.split("\n");
    trace = trace.filter(x => x.indexOf("node_modules") < 0).map(x => {    
        if(/at Object\.Exceptions/.test(x)){
            const name = /\[as (\w+)\]/.exec(x);
            if(name)
                return `${error.slice(error.indexOf("index.js") + 8).replace(": ", `\n${name[1]}: `)}`
            else
                return x
        }
        return x;
    });
    
    error = error.replace(/:.+?:/, ":")
    
    let marginMax = trace.reduce((margin, string) => Math.max(margin, string.indexOf("(/")), 0);

    let print = `\n${error}\n \n`;
    for(const line of trace){
        const loc = /at (.+) \(.+packages\/plugin-(.+):(\d+):(\d+)/.exec(line);
        if(loc){
            const [_, scope, file, ln, column] = loc;
            const spacing = Array(marginMax - line.indexOf("(/")).fill(" ").join("");
            const relative = file.replace(/\/src/, "");
            print += `  at ${scope}${spacing}   ${relative}:${ln} \n`
        }
        else 
            print += "\n " + line + "\n";
    }

    console.error(print + "\n ");
}

function onDone(a, b){
    console.log("Done")
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
        .on('end', (a,b,c) => {
            onDone()
        })
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