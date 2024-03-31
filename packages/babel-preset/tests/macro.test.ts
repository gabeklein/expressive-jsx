import { parser } from "./adapter";

it("will bail on repeat macro", async () => {
  function foo(value: any) {
    return {
      foo: value + "Baz",
    };
  }

  const parse = parser({
    macros: [{ foo }],
  });

  const output = await parse(`
    const Component = () => {
      foo: "bar";

      <this />
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_2d4 {
      foo: barBaz;
    }
  `);
});

it("will convert native hex color", async () => {
  const output = await parser(`
    const Component = () => {
      color: 0xff0000;
      background: 0x00ff0022;

      <this />
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_2bk {
      color: #ff0000;
      background: rgba(0,255,0,0.133);
    }
  `);
});

it.skip("will apply complex style", async () => {
  const output = await parser(`
    const Component = () => {
      transform: translateX(10), rotate(90), scale(2);
    
      <this>Hello</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = () => <this className="transform_tl9">Hello</this>;
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .transform_tl9 {
      transform: translateX(10px) rotate(90deg) scale(2);
    }
  `);
});
