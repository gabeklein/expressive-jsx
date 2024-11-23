import { expect, it } from 'vitest';
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

      inner: {
        color: blue;
      }

      thing: {
        fontStyle: italic;
      }

      <inner>
        <thing>Hello</thing>
      </inner>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    function Component(props) {
      return (
        <div
          {...props}
          className={classNames(props.className, 'Component_192')}>
          <div className="inner_tla">
            <div className="thing_tla">Hello</div>
          </div>
        </div>
      );
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_192 {
      color: red;
    }
    .inner_tla {
      color: blue;
    }
    .thing_tla {
      font-style: italic;
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
          className: classNames(props.className, 'Hi_192')
        }),
        'Hello World!'
      );
  `);
});
