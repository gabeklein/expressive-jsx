const { run } = require("./_adapter")

test("basic style", async () => {
  const { jsx, js } = await run(`
    const Component = () => do {
      color: green;
    
      <this>Hello World</this>
    };
  `);

  expect(js).toMatchSnapshot();
  expect(jsx).toMatchSnapshot();
})