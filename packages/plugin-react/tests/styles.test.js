const test = require("./_adapter");

describe("styles", () => {
  test("basic style", `
    const Component = () => do {
      color: green;
  
      <this>Hello World</this>
    };
  `);
})