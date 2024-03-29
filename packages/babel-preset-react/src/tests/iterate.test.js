transform("for statement", `
  () => {
    for(let i = 0; i < 10; i++)
      <div>Number: {i}</div>
  };
`);

transform("for-in statement", `
  () => {
    for(const item in group)
      <div>{group[item]}</div>
  };
`);

transform("for-of statement", `
  () => {
    for(const item of group)
      <div>{item}</div>
  };
`);

transform("for-of statement; key defined", `
  () => {
    for(const item of group)
      <div key={item}>{item}</div>
  };
`);