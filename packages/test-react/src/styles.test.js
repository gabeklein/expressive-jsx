const test = require("./_adapter");

test("basic style", `
  () => do {
    color: green;

    <this>Hello World</this>
  };
`);