const HtmlWebpackPlugin = require("html-webpack-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const { ExtractCSSPlugin } = require("./bin/ExtractCSSPlugin")

const BABEL = {
  plugins: [
    "react-refresh/babel"
  ],
  presets: [
    "@babel/preset-typescript",
    ["@expressive/babel-preset-react", {
      hot: true
    }]
  ]
}

/** @type {import("webpack").Configuration} */
module.exports = {
  mode: "development",
  entry: "./src/index.js",
  devtool: "source-map",
  output: {
    path: __dirname + "/public",
    publicPath: "/"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: BABEL
        }
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader"
        ]
      },
    ]
  },
  plugins: [
    new ExtractCSSPlugin(),
    new ReactRefreshWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "./src/index.html"
    })
  ]
}