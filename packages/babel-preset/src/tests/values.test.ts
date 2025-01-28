import { expect, it } from 'vitest';
import { parser } from "./adapter";

it("will convert camelCase properties to dash", async () => {
  const output = await parser(`
    const Component = () => {
      boxSizing: border-box;
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_14k {
      box-sizing: border-box;
    }
  `);
});

it("will convert numbers to px", async () => {
  const output = await parser(`
    const Component = () => {
      fontSize: 12;
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_25s {
      font-size: 12px;
    }
  `);
});

it("will convert decimal to em", async () => {
  const output = await parser(`
    const Component = () => {
      fontSize: 1.5;
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_2hp {
      font-size: 1.5em;
    }
  `);
});

it("will convert $-prefixed properties to css variables", async () => {
  const output = await parser(`
    const Component = () => {
      $colorPrimary: blue;

      something: {
        color: $colorPrimary;
      }

      <something>
        Hello
      </something>
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_27z {
      --color-primary: blue;
    }
    .something_tla {
      color: var(--color-primary);
    }
  `);
});