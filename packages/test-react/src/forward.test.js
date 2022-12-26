const test = require("./_adapter");

describe("forward", () => {
  test("className", `
    () => {
      forward: className;

      <div>Hello World</div>
    }
  `);

  test("will join with existing styles", `
    () => {
      forward: className;
      color: red;

      <div>Hello World</div>
    }
  `);

  test("will pull className from existing props", `
    (props) => {
      forward: className;

      <div>Hello World</div>
    }
  `);

  test("will pull className from existing destructure", `
    ({ name }) => {
      forward: className;

      <div>Hello {name}</div>
    }
  `);

  test("will pull className from declared destructure", `
    (props) => {
      const { name } = props;

      forward: className;

      <div>Hello {name}</div>
    }
  `);

  test("will not break where ...rest exists", `
    ({ name, ...rest }) => {
      forward: className;

      <div {...rest}>
        Hello {name}
      </div>
    }
  `);

  // test("react ref", `
  //   ({ active }) => {
  //     input: {
  //       disabled = !active;
  //       color: red;
  //       forward: ref;
  //     }
      
  //     <this>
  //       <input type="text" />
  //     </this>
  //   }
  // `)
})