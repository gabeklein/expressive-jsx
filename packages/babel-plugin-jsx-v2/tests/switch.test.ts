import { parser } from "./adapter";

it.skip("will apply styles", async () => {
  const output = await parser(`
    const Component = ({ active }) => {
      color: blue;
      
      if(active)
        color: red;
      
      <this>Hello</this>
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    const Component = ({ className, active, ...rest }) => {
      return (
        <div
          {...rest}
          className={classNames(className, 'Component_ifp', active && "active_ifp")}>
          Hello
        </div>
      );
    };
  `);

  expect(output.css).toMatchInlineSnapshot(`
    .Component_ifp {
      color: blue;
    }
    .active_ifp {
      color: red;
    }
  `);
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
