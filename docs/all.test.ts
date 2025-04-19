import { PluginItem } from '@babel/core';
import { expect, it } from 'vitest';

import Preset from '..';

// drop quotes from string snapshot
expect.addSnapshotSerializer({
  test: x => typeof x == "string",
  print: output => output as string
});

type Styles = Record<string, Record<string, string>>;
type Output = { code: string; css: string };

declare function parser(code: string): Promise<Output>;
declare function parser(options: Preset.Options, plugins?: PluginItem[]): (code: string) => Promise<Output>;

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

it("will convert named element without styles", async () => {
  const output = await parser(`
    const Component = () => {
      <hello />
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = () => <div />;
  `);
});

it("will drop default macros", async () => {
  const sanityCheck = await parser(`
    const Component = () => {
      absolute: fill;
    }
  `);

  expect(sanityCheck.css).toMatchInlineSnapshot(`
    .Component_14i {
      bottom: 0;
      right: 0;
      left: 0;
      top: 0;
      position: absolute;
    }
  `);

  const parse = parser({
    macros: [false]
  });

  const output = await parse(`
    const Component = () => {
      absolute: fill;
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_14i {
      absolute: fill;
    }
  `);
});

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

it("will bail on repeat macro", async () => {
  function foo(value: any) {
    return {
      foo: value + "Baz",
    };
  }

  const parse = parser({
    macros: [{ foo }],
  });

  const output = await parse(`
    const Component = () => {
      foo: "bar";
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_238 {
      foo: barBaz;
    }
  `);
});

it("will convert native hex color", async () => {
  const output = await parser(`
    const Component = () => {
      color: 0xff0000;
      background: 0x00ff0022;
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_23b {
      color: #ff0000;
      background: rgba(0, 255, 0, 0.133);
    }
  `);
});

it("will apply complex style", async () => {
  const output = await parser(`
    const Component = () => {
      transform: translateX(10), rotate(90), scale(2);
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = (props) => (
      <div
        {...props}
        className={classNames(props.className, 'Component_2du')}
      />
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_2du {
      transform: translateX(10) rotate(90) scale(2);
    }
  `);
});

it("will apply absolute", async () => {
  const output = await parser(`
    const Component = () => {
      absolute: fill-bottom;
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_2a4 {
      bottom: 0;
      right: 0;
      left: 0;
      position: absolute;
    }
  `);
});

it("will apply outline macro", async () => {
  const output = await parser(`
    const Component = () => {
      outline: red;
    }
  `)

  expect(output.css).toMatchInlineSnapshot(`
    .Component_13o {
      outline: 1px dashed red;
    }
  `);
});

it("will apply hover pseudo class", async () => {
  const output = await parser(`
    const Component = () => {
      if(':hover')
        color: red;

      <this>Hello</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = (props) => (
      <div
        {...props}
        className={classNames(props.className, 'Component_2bb')}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_2bb:hover {
      color: red;
    }
  `);
});

it("will apply hover pseudo class with nested", async () => {
  const output = await parser(`
    const Component = () => {
      color: red;
    
      if(":after"){
        content: " World!";
      }
    
      if(".active"){
        color: blue;
        
        if(":after")
          color: green
      }
    
      <this>
        Hello
      </this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = (props) => (
      <div
        {...props}
        className={classNames(props.className, 'Component_2id')}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_2id {
      color: red;
    }
    .Component_2id:after {
      content:  World!;
    }
    .Component_2id.active {
      color: blue;
    }
    .Component_2id.active:after {
      color: green;
    }
  `);
});

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
          className={classNames(props.className, 'Component_215')}>
          <div className="inner_tla">
            <div className="thing_tla">Hello</div>
          </div>
        </div>
      );
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_215 {
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

it.skip("will not race normal jsx plugin", async () => {
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

it("will apply", async () => {
  const output = await parser(`
    const Component = () => {
      div: {
        color: blue;
      }
    
      <div>Hello</div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(
    `const Component = () => <div className="div_tla">Hello</div>;`
  );

  expect(output.css).toMatchInlineSnapshot(`
    .div_tla {
      color: blue;
    }
  `);
});

it("will apply to this", async () => {
  const output = await parser(`
    const Component = () => {
      color: red;
    
      <this>
        Hello World
      </this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = (props) => (
      <div
        {...props}
        className={classNames(props.className, 'Component_26k')}>
        Hello World
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_26k {
      color: red;
    }
  `);
});

it("will apply to attributes", async () => {
  const output = await parser(`
    const Component = () => {
      inner: {
        color: red;
      }

      <div>
        Hello
        <div inner>World</div>
      </div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = () => (
      <div>
        Hello
        <div className="inner_tla">World</div>
      </div>
    );
  `);
});

it("will apply to attribute this", async () => {
  const output = await parser(`
    const RedInput = () => {
      color: red;
    
      <input this />
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const RedInput = (props) => (
      <input
        {...props}
        className={classNames(props.className, 'RedInput_245')}
      />
    );
  `);
});

it("will keep existing className", async () => {
  const output = await parser(`
    const Component = () => {
      div: {
        color: blue;
      }
    
      <div className="foobar">Hi</div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(
    `const Component = () => <div className="foobar div_tla">Hi</div>;`
  );
});

it("will apply nested", async () => {
  const output = await parser(`
    const Component = () => {
      container: {
        color: blue;

        inner: {
          color: red;
        }
      }
    
      <container>
        Hello <inner>World</inner>
      </container>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = () => (
      <div className="container_tla">
        Hello <div className="inner_wj9">World</div>
      </div>
    );
  `);
});

it("will apply nested to attributes", async () => {
  const output = await parser(`
    const Component = () => {
      item: {
        color: blue;

        red: {
          color: red;
        }
      }
    
      <div>
        <item />
        <item red />
      </div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = () => (
      <div>
        <div className="item_tla" />
        <div className="item_tla red_jh9" />
      </div>
    );
  `);
});

it("will apply to jsx in conditional statement", async () => {
  const output = await parser(`
    const Component = () => {
      div: {
        color: blue;
      }
    
      <this>
        {true && <div>Hello</div>}
      </this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = (props) => (
      <div {...props}>
        {true && <div className="div_tla">Hello</div>}
      </div>
    );
  `);
});

it("will export styles in order", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      color: blue;
    
      if(active)
        color: yellow;
    
      something: {
        color: purple;
      }
    
      div: {
        color: red;
    
        something: {
          color: green;
        }
      }
    
      <this>
        <div something />
      </this>
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_137 {
      color: blue;
    }
    .active_tla {
      color: yellow;
    }
    .div_tla {
      color: red;
    }
    .something_tla {
      color: purple;
    }
    .something_roo {
      color: green;
    }
  `);
});

it("will prioritize capitalized styles", async () => {
  const output = await parser(`
    const Component = () => {
      Something: {
        color: blue;
      }
    
      <this>
        <Something />
      </this>
    }
    
    const Something = () => {
      color: purple;
    
      something: {
        color: red;
      }
      
      <this something>
        Something
      </this>
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Something_15e {
      color: purple;
    }
    .something_jsf {
      color: red;
    }
    .Something_tla {
      color: blue;
    }
  `);
});

it("will use classnames from module", async () => {
  const parse = parser({
    cssModule: "./styles.module.css",
  });

  const output = await parse(`
    const Component = () => {
      div: {
        color: blue;
      }
    
      <div>Hello</div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    import css from './styles.module.css';
    const Component = () => <div className={css.div_tla}>Hello</div>;
  `);
});

it("will handle border correctly", async () => {
  const output = await parser(`
    const Component = () => {
      border: dashed, 2, $borderLight;
    
      <this>Hello</this>
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_22h {
      border: dashed var(--border-light) 2px;
    }
  `);
});

it("will apply to this", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      if(active)
        color: red;
      
      <this>Hello</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = ({ className, active, ...rest }) => (
      <div
        {...rest}
        className={classNames(className, active && 'active_tla')}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .active_tla {
      color: red;
    }
  `);
});

it("will apply else", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      background: white;

      if(active)
        color: red;
      else
        color: blue;
      
      <this>Hello</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = ({ className, active, ...rest }) => (
      <div
        {...rest}
        className={classNames(
          'Component_2a2',
          active ? 'active_tla' : 'else_tla',
          className
        )}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_2a2 {
      background: white;
    }
    .active_tla {
      color: red;
    }
    .else_tla {
      color: blue;
    }
  `);
});

it("will apply to selector", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      div: {
        color: blue;
        
        if(active)
          color: red;
      }
      
      <div>Hello</div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = ({ active }) => (
      <div className={classNames('div_tla', active && 'active_roo')}>
        Hello
      </div>
    );
  `);
});

it("will apply to child selector", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      if(active)
        div: {
          color: red;
        }

      <this>
        <div>Hello</div>
      </this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = ({ className, active, ...rest }) => (
      <div
        {...rest}
        className={classNames(className, active && 'active_tla')}>
        <div className="div_xt4">Hello</div>
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .active_tla .div_xt4 {
      color: red;
    }
  `);
});

// might not keep this
it.skip("will apply without brackets", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      div: if(active)
        color: red;
      
      <div>Hello</div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot();
  expect(output.css).toMatchInlineSnapshot();
});

it.skip("will recycle child classnames", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      div: {
        color: green;
      }
    
      if(active)
        div: {
          color: red;
        }
      else
        div: {
          color: blue;
        }
    
      <this>
        <div>
          Hello World
        </div>
      </this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = ({ className, active, ...rest }) => (
      <div
        {...rest}
        className={classNames(
          className,
          active ? 'active_tla' : 'not_active_tla'
        )}>
        <div className="div_tla div_xt4">Hello World</div>
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .div_tla {
      color: green;
    }
    .active_tla .div_xt4 {
      color: red;
    }
  `);
});

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