const test = require("./_adapter");

describe("pseudo", () => {
  test("before/after", `
    () => do {
      css: before: {
        content: "This is content"
        color: blue;
      }

      css: after: {
        background: red;
        color: white;
      }

      <div>Hello</div>
    }
  `);

  test("nthOfType", `
    () => do {
      css: nthOfType: {
        select: "2n"
        color: blue;
      }
      
      css: nthOfType: {
        select: "3n+2"
        color: red;
      }

      <div>Hello</div>
    }
  `);
});

describe("css", () => {
  test("directive", `
    () => do {
      color: blue;
      
      css: has: {
        isRed: {
          color: red;
        }
      }

      <div>Hello</div>
    }
  `);

  test("multiple directives", `
    () => do {
      color: blue;
      
      css: has: {
        isRed: {
          color: red;
        }

        isGreen: {
          color: green;
        }
      }

      <div>Hello</div>
    }
  `);
});