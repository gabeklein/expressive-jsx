const { run } = require("./_adapter")

test("basic component", async () => {
  const { jsx, js } = await run(`
    const Component = () => do {
      <div>Hello World</div>
    }
  `);

  expect(js).toMatchSnapshot();
  expect(jsx).toMatchSnapshot();
})