const test = require("./_adapter");

test("basic component", `
  const Component = () => do {
    <div>Hello World</div>
  }
`);