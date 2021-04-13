const test = require("./_adapter");

test("collapse style-only expression", `
  const props = do {
    color: red;
  }
`);