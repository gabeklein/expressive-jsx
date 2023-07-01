describe("forward", () => {
  transform("className", `
    () => {
      forward: className;

      <div>Hello World</div>
    }
  `);

  transform("will join with existing styles", `
    () => {
      forward: className;
      color: red;

      <div>Hello World</div>
    }
  `);

  transform("will pull className from existing props", `
    (props) => {
      forward: className;

      <div>Hello World</div>
    }
  `);

  transform("will pull className from existing destructure", `
    ({ name }) => {
      forward: className;

      <div>Hello {name}</div>
    }
  `);

  transform("will pull className from declared destructure", `
    (props) => {
      const { name } = props;

      forward: className;

      <div>Hello {name}</div>
    }
  `);

  transform("will not break where ...rest exists", `
    ({ name, ...rest }) => {
      forward: className;

      <div {...rest}>
        Hello {name}
      </div>
    }
  `);

  transform("react ref", `
    ({ active }) => {
      input: {
        disabled = !active;
        color: red;
        forward: ref;
      }
      
      <this>
        <input type="text" />
      </this>
    }
  `)
})