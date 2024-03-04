import { parser } from "./adapter";

it("will forward props", async () => {
  const output = await parser(`
    const Component = () => {
      color: blue;

      <this />
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = (props) => (
      <div
        {...props}
        className={classNames(props.className, 'Component_oy2')}
      />
    );
  `);
});

it("will forward existing props", async () => {
  const output = await parser(`
    const Component = () => {
      color: blue;

      <this />
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = (props) => (
      <div
        {...props}
        className={classNames(props.className, 'Component_86w')}
      />
    );
  `);
});

it("will return this if no JSX", async () => {
  const output = await parser(`
    const Component = () => {
      color: red;
      width: "16px";
      background: "blue";
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = (props) => (
      <div
        {...props}
        className={classNames(props.className, 'Component_t6t')}
      />
    );
  `);
});

it("will forward props to this attribute", async () => {
  const output = await parser(`
    const Component = () => {
      color: blue;

      <input this />
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = (props) => (
      <input
        {...props}
        className={classNames(props.className, 'Component_5hx')}
      />
    );
  `);
});
