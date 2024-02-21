import { parser } from "./adapter";

it("will return implicitly", async () => {
  const output = await parser(`
    function Component(){
      <div>Hello</div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    function Component() {
      return <div>Hello</div>;
    }
  `);
});

it("will optimize arrow expression", async () => {
  const output = await parser(`
    const Component = () => {
      <div>Hello</div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(
    `const Component = () => <div>Hello</div>;`
  );
});

it("will not optimize with statements", async () => {
  const output = await parser(`
    const Component = () => {
      const name = "World";

      <div>Hello {name}</div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = () => {
      const name = 'World';
      return <div>Hello {name}</div>;
    };
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
        className={classNames(props.className, 'Component_ifp')}
      />
    );
  `);
});
