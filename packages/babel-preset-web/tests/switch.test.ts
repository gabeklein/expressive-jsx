import { parser } from "./adapter";

it("will apply to this", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      if(active)
        color: red;
      
      <this>Hello</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = ({ children, className, active, ...rest }) => (
      <div
        {...rest}
        className={classNames(className, active && 'active_tla')}>
        Hello{children}
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
      if(active)
        color: red;
      else
        color: blue;
      
      <this>Hello</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = ({ children, className, active, ...rest }) => (
      <div
        {...rest}
        className={classNames(
          className,
          active ? 'active_tla' : 'not_active_tla'
        )}>
        Hello{children}
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .active_tla {
      color: red;
    }
    .not_active_tla {
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
      <div className={classNames(active && 'active_roo', 'div_tl9')}>
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
    const Component = ({ children, className, active, ...rest }) => (
      <div
        {...rest}
        className={classNames(className, active && 'active_tla')}>
        <div className="div_xt4">Hello</div>
        {children}
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
