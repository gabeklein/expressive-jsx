const test = require("./_adapter");

test("component", `
  () => do {
    <div>Hello World</div>
  }
`);

test("multiple", `
  ({ hello }) => do {
    <this>
      <div>Foo</div>
      <div>Bar</div>
    </this>
  }
`);