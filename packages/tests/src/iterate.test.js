const test = require("./_adapter");

test("for statement", `
  () => do {
    for(let i = 0; i < 10; i++)
      <div>Number: {i}</div>
  };
`);

test("for-in statement", `
  () => do {
    for(const item in group)
      <div>{group[item]}</div>
  };
`);

test("for-of statement", `
  () => do {
    for(const item of group)
      <div>{item}</div>
  };
`);

test("for-of statement; key defined", `
  () => do {
    for(const item of group)
      <div key={item}>{item}</div>
  };
`);