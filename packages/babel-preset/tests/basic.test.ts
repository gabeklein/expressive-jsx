import { expect, it } from "vitest";
import { parser } from "./adapter";

it("will pass", async () => {
  const output = await parser(`
    const Component = () => {
      hello: {
        color: red;
      }

      <hello />
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .hello_tla {
      color: red;
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = () => <div className="hello_tla" />;
  `);
})

it("will drop default macros", async () => {
  const sanityCheck = await parser(`
    const Component = () => {
      absolute: fill;
    }
  `);

  expect(sanityCheck.css).toMatchInlineSnapshot(`
    .Component_185 {
      bottom: 0;
      right: 0;
      left: 0;
      top: 0;
      position: absolute;
    }
  `);

  const parse = parser({
    macros: [false]
  });

  const output = await parse(`
    const Component = () => {
      absolute: fill;
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_185 {
      absolute: fill;
    }
  `);
})