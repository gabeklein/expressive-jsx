/** @type {import("jest").Config} */
module.exports = {
  "preset": "ts-jest",
  "testTimeout": 1000,
  "moduleDirectories": [
    './src',
    './node_modules'
  ],
  "coveragePathIgnorePatterns": [
    "./src/index.ts"
  ],
  "setupFilesAfterEnv": [
    "./jest.setup.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 100,
      "functions": 100,
      "lines": 100,
      "statements": 100
    }
  }
}