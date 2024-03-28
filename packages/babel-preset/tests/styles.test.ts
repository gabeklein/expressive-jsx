import { parser } from "./adapter";

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
        className={classNames(props.className, 'Component_17j')}>
        Hello World
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_17j {
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
        className={classNames(props.className, 'RedInput_140')}
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

it("will convert camelCase properties to dash", async () => {
  const output = await parser(`
    const Component = () => {
      boxSizing: border-box;
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_13j {
      box-sizing: border-box;
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
    .Component_2gt {
      --color-primary: blue;
    }
    .something_tla {
      color: var(--color-primary);
    }
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
    .Component_2fr {
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
    .Something_2bj {
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
