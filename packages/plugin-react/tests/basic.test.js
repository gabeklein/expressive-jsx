const test = require("./_adapter");

describe("basics", () => {
  test("component", `
    const Component = () => do {
      <div>Hello World</div>
    }
  `);

  test("multiple", `
    const Component = ({ hello }) => do {
      <this>
        <div>Foo</div>
        <div>Bar</div>
      </this>
    }
  `);

  test("switch", `
    const Component = ({ hello }) => do {
      if(hello)
        <div>Hello World</div>
      else
        <div>Goodbye World</div>
    }
  `);
})