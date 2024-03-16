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

      <div>
        <div>Hello</div>
      </div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    function Component(props) {
      return (
        <div
          {...props}
          className={classNames(props.className, 'Component_cfu')}>
          <div>
            <div>Hello</div>
          </div>
        </div>
      );
    }
  `);
});

it("will not race normal jsx plugin", async () => {
  const parse = parser({}, [
    [
      "@babel/plugin-transform-react-jsx",
      {
        useBuiltIns: true,
      },
    ],
  ]);

  const output = await parse(`
    export const Hi = () => {
      color: red;
      fontSize: 2.0;
    
      <this>Hello World!</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    export const Hi = (props) =>
      /*#__PURE__*/ React.createElement(
        'div',
        Object.assign({}, props, {
          className: classNames(props.className, 'Hi_2uq')
        }),
        'Hello World!'
      );
  `);
});
