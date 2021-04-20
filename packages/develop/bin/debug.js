const gulp = require("gulp");
const babel = require("gulp-babel");
const replace = require('gulp-replace');
const prettier = require("gulp-prettier");
const prettyjson = require("prettyjson")

// const printError = require("./error")
const babelrc = require("./babel.config")

let {
  IN,
  OUT,
  TEST_DEFAULT = false
} = process.env;

if(TEST_DEFAULT || !IN)
  IN = "input/"

if(TEST_DEFAULT || !OUT)
  OUT = "output/"

const inDir = IN.replace(/\/$/, "").concat("/*.js");
const outDir = OUT.replace(/\/$/, "");

const statementLineSpacing = () =>
  replace(/^(.+?)\n(export|const|let)/gm, "$1\n\n$2")

const jsxReturnSpacing = () =>
  replace(/^(.+?[^{])\n(\s+return (?=\(|<))/gm, "$1\n\n$2")

const removeDoubleLines = () =>
  replace(/\n{3,}/g, "\n\n")

const spaceOutBlocks = () =>
  replace(/([\t \r]*\n)([\)\}\]]+;?)([\t \r]*\n{1})(\s*[^\ni])/g, "$1$2$3\n$4")

const spaceAfterImports = () =>
  replace(/(from ".+";?)([\t \r]*\n)([^\ni])/g, "$1$2\n$3");

gulp.task('xjs', (done) => {
  gulp
    .src([inDir])
    .pipe(babel(babelrc))
    .on('error', function(e){
      // printError(e);
      console.error(
        prettyjson.render(e).replace(/\n/g, "\n  ")
      )
      console.log("\n\Watch task has crashed, restart session to resume.")
    })
    .pipe(prettier({ 
      singleQuote: false, 
      trailingComma: "none", 
      jsxBracketSameLine: true,
      printWidth: 60
    }))
    .pipe(statementLineSpacing())
    .pipe(jsxReturnSpacing())
    .pipe(spaceOutBlocks())
    .pipe(spaceAfterImports())
    .pipe(removeDoubleLines())
    .pipe(gulp.dest(outDir))
    .on('end', done);
});

gulp.task("watch", () => {
  gulp.watch(inDir, gulp.series(['xjs']));
  console.log(`Watching for changes in ${inDir} files...`)
})

gulp.series(["xjs", "watch"])()