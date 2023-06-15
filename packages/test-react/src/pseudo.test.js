const test = require("./_adapter");

describe("pseudo", () => {
  test("before/after", `
    () => {
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
    () => {
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
    () => {
      color: blue;
      
      css: self: {
        isRed: {
          color: red;
        }
      }

      <div>Hello</div>
    }
  `);

  test("multiple directives", `
    () => {
      color: blue;
      
      css: self: {
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