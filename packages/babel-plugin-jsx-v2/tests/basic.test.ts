import { parser } from "./adapter";

it("will apply styles", async () => {
  const output = await parser(`
    const Component = () => {
      div: {
        color: blue;
        fontSize: "1.5em";
      }

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
      <div className="div_tl9">
        Hello
        <div className="div_tl9 inner_tl9">World</div>
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .div_tl9 {
      color: blue;
      fontSize: 1.5em;
    }
    .inner_tl9 {
      color: red;
    }
  `);
});

it("will pass-thru existing className", async () => {
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

it("will apply style to this", async () => {
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

it("will apply nested styles", async () => {
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

it("will apply nested styles to attributes", async () => {
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

it("will bail on repeat macro", async () => {
  function foo(value: any){
    return {
      foo: value + "Baz"
    }
  }
  
  const parse = parser({ macros: [{foo}] });

  const output = await parse(`
    const Component = () => {
      foo: "bar";

      <this />
    }
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_ifp {
      foo: barBaz;
    }
  `);
});
