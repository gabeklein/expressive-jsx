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
    `const Component = () => <div className="div_tl9">Hello</div>;`
  );

  expect(output.css).toMatchInlineSnapshot(`
    .div_tl9 {
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
        className={classNames(props.className, 'Component_ifp')}>
        Hello World
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_ifp {
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
        <div className="inner_tl9">World</div>
      </div>
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
    `const Component = () => <div className="foobar div_tl9">Hi</div>;`
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
        <div className="item_tl9" />
        <div className="item_tl9 red_jh9" />
      </div>
    );
  `);
});