const test = require("./_adapter");

test("basic style", `
  const Component = () => do {
    color: green;

    <this>Hello World</this>
  };
`);