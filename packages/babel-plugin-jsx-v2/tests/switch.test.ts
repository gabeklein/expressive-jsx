import { parser } from "./adapter";

it("will apply to this", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      color: blue;
      
      if(active)
        color: red;
      
      <this>Hello</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = ({ className, active, ...rest }) => (
      <div
        {...rest}
        className={classNames(className, 'Component_ifp', active && "active_ifp")}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_ifp {
      color: blue;
    }
    .element_tl9 {
      color: red;
    }
  `);
});

it.skip("will apply to selector", async () => {
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
      <div className="div_tl9">Hello</div>
    );
  `);
});

it.skip("will apply styles", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      div: if(active)
        color: red;
      
      <div>Hello</div>
    }
  `);

  expect(output.code).toMatchInlineSnapshot();
});

it.skip("will apply styles", async () => {
  const output = await parser(`
    const Component = () => {
      if("active")
        color: red;
      
      <this>Hello</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot();
  expect(output.css).toMatchInlineSnapshot();
});
