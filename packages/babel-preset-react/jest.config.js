/** @type {import("jest").Config} */
module.exports = {
  transform: {
    "^.+\\.[tj]s$": "ts-jest",
  },
  "setupFilesAfterEnv": [
    "./jest.setup.ts"
  ]
}