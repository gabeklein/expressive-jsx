/** @type {import("jest").Config} */
module.exports = {
  transform: {
    "^.+\\.[tj]s$": "ts-jest",
  },
  "moduleDirectories": [
    './src',
    './node_modules'
  ],
  "coveragePathIgnorePatterns": [
    "./src/index.ts"
  ]
}