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

transform("nested element", `
  () => {
    foo: {
      bar: {
        color: red;

        baz: {
          color: blue;
        }
      }
    }

    <foo>
      <baz />
      <bar>
        <baz />
      </bar>
    </foo>
  }
`);