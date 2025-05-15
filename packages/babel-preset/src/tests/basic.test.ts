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

it("will convert named element without styles", async () => {
  const output = await parser(`
    const Component = () => {
      <hello />
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = () => <div />;
  `);
})

it("will drop default macros", async () => {
  const sanityCheck = await parser(`
    const Component = () => {
      absolute: fill;
    }
  `);

  expect(sanityCheck.css).toMatchInlineSnapshot(`
    .Component_14i {
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
    .Component_14i {
      absolute: fill;
    }
  `);
})

it("convert camelCase css values to dash-case", async () => {
  const output = await parser(`
    const Component = () => {
      hello: {
        boxSizing: border-box;
      }

      <hello />
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .hello_tla {
      box-sizing: border-box;
    }
  `);
})