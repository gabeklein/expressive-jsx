module.exports = {
  comments: false,
  plugins: [
    ["@expressive/babel-plugin-jsx", {
      hot: false, 
      output: process.env.TARGET || "jsx",
      printStyle: "pretty",
      modifiers: [
        require("@expressive/macro-css"),
        require("@expressive/macro-gradient")
      ]
    }]
  ]
}