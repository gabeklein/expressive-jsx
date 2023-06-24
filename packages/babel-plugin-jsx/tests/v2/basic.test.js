transform("style", `
  const App = () => {
    color: red;

    <this>Hello World</this>
  }
`)

transform("nested style", `
  const App = () => {
    element: {
      color: red;
    }

    <element>Hello World</element>
  }
`)