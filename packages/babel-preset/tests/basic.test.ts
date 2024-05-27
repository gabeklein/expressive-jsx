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