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

transform("with existing className prop", `
  () => {
    element: {
      color: red;
    }

    <element className="foo">Hello World</element>
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

transform("competing style priority", `
  () => {
    Bar: { color: blue }
    Foo: {
      Bar: { color: orange }
    }

    <Foo>
      <Bar />
    </Foo>
  };
`);

transform("triple modifiers", `
  () => {
    baz: {
      color: red;
    }
    Bar: {
      color: blue
    }
    Foo: {
      Bar: {
        color: orange
      }
    }

    <Foo>
      <Bar baz />
    </Foo>
  };
`);