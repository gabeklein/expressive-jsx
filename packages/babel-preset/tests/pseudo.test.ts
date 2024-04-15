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
        className={classNames(props.className, 'Component_23z')}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_23z:hover {
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
        className={classNames(props.className, 'Component_2gh')}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_2gh {
      color: red;
    }
    .Component_2gh:after {
      content:  World!;
    }
    .Component_2gh.active {
      color: blue;
    }
    .Component_2gh.active:after {
      color: green;
    }
  `);
});
