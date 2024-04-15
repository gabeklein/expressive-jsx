import { expect, it } from 'vitest';
import { parser } from "./adapter";

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
        className={classNames(props.className, 'Component_23c')}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_23c:hover {
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
        className={classNames(props.className, 'Component_16j')}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_Component_16j {
      color: red;
    }
    .Component_Component_16j:after {
      content:  World!;
    }
    .Component_Component_16j.active {
      color: blue;
    }
    .Component_Component_16j.active:after {
      color: green;
    }
  `);
});
