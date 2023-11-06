/** @type {import("jest").Config} */
module.exports = {
  transform: {
    "^.+\\.[tj]s$": "ts-jest",
  },
  "coveragePathIgnorePatterns": [
    "./src/index.ts"
  ],
  "setupFilesAfterEnv": [
    "./jest.setup.ts"
  ]
}