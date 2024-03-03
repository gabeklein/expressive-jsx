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
        className={classNames(props.className, 'Component_qyw')}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_qyw:hover {
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
        className={classNames(props.className, 'Component_pp5')}>
        Hello
      </div>
    );
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_pp5 {
      color: red;
    }
    .Component_pp5:after {
      content:  World!;
    }
    .Component_pp5.active {
      color: blue;
    }
    .Component_pp5.active:after {
      color: green;
    }
  `);
});
