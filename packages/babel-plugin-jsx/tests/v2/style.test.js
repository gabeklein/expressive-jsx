transform("hoisted", `
  const App = () => {
    color: red;

    <this>Hello World</this>
  }
`)

transform("element", `
  () => {
    element: {
      color: red;
    }

    <element>Hello World</element>
  }
`)