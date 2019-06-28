const gulp = require("gulp");
const babel = require("gulp-babel");
const replace = require('gulp-replace');
const prettier = require("gulp-prettier");

const printError = require("./error")
const babelrc = require("./babel.config")

const {
  INPUT = "input/",
  OUT = "output/"
} = process.env;

const statementLineSpacing = () =>
    replace(/^(.+?)\n(export|const|let)/gm, "$1\n\n$2")

const jsxReturnSpacing = () =>
    replace(/^(.+?[^{])\n(\s+return (?=\(|<))/gm, "$1\n\n$2")

const inDir = INPUT.replace(/\/$/, "").concat("/*.js");
const outDir = OUT.replace(/\/$/, "");

const prettyConfig = { 
  singleQuote: false, 
  trailingComma: "none", 
  jsxBracketSameLine: true,
  printWidth: 60
};

gulp.task('onChange', () => {
  console.log("File Changed!")
})

gulp.task('xjs', (done) => {
  gulp.src([inDir])
      .pipe(babel({ babelrc: false, ...babelrc }))
      .on('error', function(e){
        printError(e);
        console.log("\n\Watch task has crashed, restart session to resume.")
      })
      .pipe(prettier(prettyConfig))
      .pipe(statementLineSpacing())
      .pipe(jsxReturnSpacing())
      .pipe(gulp.dest(outDir))
      .on('end', done);
});

gulp.task("watch", () => {
  gulp.watch(inDir, gulp.series(['xjs', 'onChange']));
  console.log(`Watching for changes in ${inDir} files...`)
})

gulp.series(["xjs", "watch"])()