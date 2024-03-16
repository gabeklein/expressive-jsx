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

it("will wrap elements if 'this' is styled", async () => {
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
          className={classNames(props.className, 'Component_cfu')}>
          <div>Hello</div>
        </div>
      );
    }
  `);
});

it("will not race normal jsx plugin", async () => {
  const parse = parser({}, true);
  const output = await parse(`
    export const Hi = () => {
      color: red;
      fontSize: 2.0;
    
      <this>Hello World!</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    export const Hi = () =>
      /*#__PURE__*/ React.createElement(this, null, 'Hello World!');
  `);
});
