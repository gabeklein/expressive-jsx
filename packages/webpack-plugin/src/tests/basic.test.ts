import { it, expect } from "vitest";
import { bundle } from "./adapter";

it("will output with css module", async () => {
  const { output } = await bundle(`
    const Component = () => {
      color: red;

      <this>
        <h1>Hello World</h1>
        This is a test.
      </this>
    }
  `);

  expect(output).toMatchSnapshot();
});
