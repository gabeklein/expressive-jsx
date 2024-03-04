/** @type {import("jest").Config} */
module.exports = {
  "transform": {
    "^.+\\.[tj]sx?$": ["ts-jest", {
      "isolatedModules": true,
    }],
  },
  "testTimeout": 1000,
  "moduleDirectories": [
    './src',
    './node_modules'
  ],
  "coveragePathIgnorePatterns": [
    "./src/index.ts"
  ]
}