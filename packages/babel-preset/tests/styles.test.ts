import { expect, it } from 'vitest';
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
        className={classNames(props.className, 'Component_190')}>
        Hello World
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_190 {
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
        className={classNames(props.className, 'RedInput_2ai')}
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
    .Component_29i {
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
    .Something_22p {
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
