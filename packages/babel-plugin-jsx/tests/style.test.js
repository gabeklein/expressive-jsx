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