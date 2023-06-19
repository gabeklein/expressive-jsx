module.exports = {
  testTimeout: 500,
  projects: [
    {
      displayName: "Babel Plugin",
      preset: "ts-jest",
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      testMatch: [
        '<rootDir>/packages/babel-plugin-jsx/tests/*.test.*'
      ],
    }
  ]
}