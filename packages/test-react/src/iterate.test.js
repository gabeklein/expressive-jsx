const test = require("./_adapter");

test("for statement", `
  () => {
    for(let i = 0; i < 10; i++)
      <div>Number: {i}</div>
  };
`);

test("for-in statement", `
  () => {
    for(const item in group)
      <div>{group[item]}</div>
  };
`);

test("for-of statement", `
  () => {
    for(const item of group)
      <div>{item}</div>
  };
`);

test("for-of statement; key defined", `
  () => {
    for(const item of group)
      <div key={item}>{item}</div>
  };
`);