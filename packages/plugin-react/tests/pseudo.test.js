const test = require("./_adapter");

describe("pseudo", () => {
  test("before/after", `
    () => do {
      before: {
        content: "This is content"
        color: blue;
      }

      after: {
        background: red;
        color: white;
      }

      <div>Hello</div>
    }
  `);

  test("nthOfType", `
    () => do {
      nthOfType: {
        select: "2n"
        color: blue;
      }
      
      nthOfType: {
        select: "3n+2"
        color: red;
      }

      <div>Hello</div>
    }
  `);
});