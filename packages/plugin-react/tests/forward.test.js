const test = require("./_adapter");

describe("forward", () => {
  test("className", `
    () => do {
      forward: className;

      <div>Hello World</div>
    }
  `);

  test("will join with existing styles", `
    () => do {
      forward: className;
      color: red;

      <div>Hello World</div>
    }
  `);

  test("will pull className from existing props", `
    (props) => do {
      forward: className;

      <div>Hello World</div>
    }
  `);

  test("will pull className from existing destructure", `
    ({ name }) => do {
      forward: className;

      <div>Hello {name}</div>
    }
  `);

  test("children", `
    () => do {
      forward: children;
      background: red;
    }
  `);

  test("children & className", `
    () => do {
      forward: className, children;
      background: red;
    }
  `);
})