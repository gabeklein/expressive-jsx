transform("style", `
  const App = () => {
    color: red;

    <this>Hello World</this>
  }
`)

transform("nested style", `
  () => {
    element: {
      color: red;
    }

    <element>Hello World</element>
  }
`)

transform("multiple children", `
  () => {
    <this>
      <div>Foo</div>
      <div>Bar</div>
    </this>
  }
`)