transform("css module styles", `
  () => {
    color: red;

    <this />
  }
`, {
  externals: true,
  extractCss(css){
    return "./somefile.module.css"
  },
})

transform("absolute macro", `
  () => {
    absolute: fill;

    <this />
  }
`)