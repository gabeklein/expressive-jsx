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

it.skip("will wrap elements if 'this' is styled", async () => {
  const output = await parser(`
    function Component(){
      color: red;

      <div>Hello</div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    function Component(props) {
      return (
        <div
          {...props}
          className={classNames(props.className, 'Component_ivp')}>
          <div>Hello</div>
        </div>
      );
    }
  `);
});
