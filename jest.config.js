/** @type {import("jest").Config} */
module.exports = {
  testTimeout: 500,
  projects: [
    {
      displayName: "Babel Plugin",
      preset: "ts-jest",
      rootDir: "packages/babel-plugin-jsx",
      moduleDirectories: ["./src", "../node_modules"],
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      testMatch: [
        '<rootDir>/tests/*.test.*'
      ],
    }
  ]
}