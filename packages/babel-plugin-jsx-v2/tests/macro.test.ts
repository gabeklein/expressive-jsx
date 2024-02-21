import { parser } from './adapter';

it("will bail on repeat macro", async () => {
  function foo(value: any) {
    return {
      foo: value + "Baz",
    };
  }

  const parse = parser({ macros: [{ foo }] });

  const output = await parse(`
    const Component = () => {
      foo: "bar";

      <this />
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_ifp {
      foo: barBaz;
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
})