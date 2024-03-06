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
        className={classNames(props.className, 'Component_7ps')}>
        Hello World
        {props.children}
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_7ps {
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
        className={classNames(props.className, 'RedInput_2y8')}
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
      <div className="container_tl9">
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
    .Component_2dj {
      box-sizing: border-box;
    }
  `);
});
