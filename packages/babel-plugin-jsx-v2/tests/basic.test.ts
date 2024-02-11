import { parser } from "./adapter";

it("will apply styles", async () => {
  const output = await parser(`
    const Component = () => {
      div: {
        color: blue;
        fontSize: "1.5em";
      }
    
      <div>
        Hello World
      </div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = () => (
      <div className="div_tl9">Hello World</div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .div_tl9 {
      color: blue;
      fontSize: 1.5em;
    }
  `);
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
        className={classNames(
          props.className,
          'Component_ifp'
        )}>
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
        fontSize: "1.5em";

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

  expect(output.css).toMatchInlineSnapshot(`
    .container_tl9 {
      color: blue;
      fontSize: 1.5em;
    }
    .inner_wj9 {
      color: red;
    }
  `);
});
