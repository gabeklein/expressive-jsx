const test = require("./_adapter");

test("basic style", `
  () => {
    color: green;

    <this>Hello World</this>
  };
`);