const gulp = require("gulp");
const babel = require("gulp-babel");
const replace = require('gulp-replace');
const prettier = require("gulp-prettier");
const prettyjson = require("prettyjson")

const printError = require("./error")
const babelrc = require("./babel.config")

let {
  TEST_INPUT,
  TEST_OUTPUT,
  TEST_DEFAULT
} = process.env;

if(TEST_DEFAULT == "false")
  TEST_DEFAULT = false;

if(TEST_DEFAULT || !TEST_INPUT)
  TEST_INPUT = "input/"

if(TEST_DEFAULT || !TEST_OUTPUT)
  TEST_OUTPUT = "output/"

const inDir = TEST_INPUT.replace(/\/$/, "").concat("/*.js");
const outDir = TEST_OUTPUT.replace(/\/$/, "");

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
    .pipe(babel({ babelrc: false, ...babelrc }))
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

gulp.task('onChange', () => {
  console.log("File Changed!")
})

gulp.task("watch", () => {
  gulp.watch(inDir, gulp.series(['xjs', 'onChange']));
  console.log(`Watching for changes in ${inDir} files...`)
})

gulp.series(["xjs", "watch"])()