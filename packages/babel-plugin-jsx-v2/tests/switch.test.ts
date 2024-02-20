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
        className={classNames(
          className,
          active && 'active_tl9',
          'Component_ifp'
        )}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_ifp {
      color: blue;
    }
    .active_tl9 {
      color: red;
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
      <div className={classNames(active && 'active_roo', 'div_tl9')}>
        Hello
      </div>
    );
  `);
});

it("will apply to child selector", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      if(active){
        div: {
          color: red;
        }
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
        className={classNames(className, active && 'active_tl9')}>
        <div className="div_xt4">Hello</div>
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .active_tl9 .div_xt4 {
      color: red;
    }
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
  expect(output.css).toMatchInlineSnapshot();
});
