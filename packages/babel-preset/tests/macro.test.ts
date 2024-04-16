import { expect, it } from 'vitest';
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
    .Component_26g {
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
    .Component_2an {
      color: #ff0000;
      background: rgba(0,255,0,0.133);
    }
  `);
});

it.only("will apply complex style", async () => {
  const output = await parser(`
    const Component = () => {
      transform: translateX(10), rotate(90), scale(2);
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = (props) => (
      <div
        {...props}
        className={classNames(props.className, 'Component_22q')}
      />
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_22q {
      transform: translateX(10) rotate(90) scale(2);
    }
  `);
});
