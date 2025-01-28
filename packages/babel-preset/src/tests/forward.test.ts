import { expect, it } from 'vitest';

import { parser } from './adapter';

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
        className={classNames(props.className, 'Component_16i')}
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
        className={classNames(props.className, 'Component_22h')}
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
        className={classNames(props.className, 'Component_2jp')}
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
        className={classNames(props.className, 'Component_16v')}
      />
    );
  `);
});

it("will forward props with no styles", async () => {
  const output = await parser(`
    export const Row = () => {
      <this />
    }
  `);

  expect(output.code).toMatchInlineSnapshot(
    `export const Row = (props) => <div {...props} />;`
  );
});
