const test = require("./_adapter");

test("Simple modifier", `
  () => {
    Foo: {
      color: red;
    }

    <Foo />
  };
`)

test("Attribute-based modifier", `
  () => {
    Foo: {
      background: red;
    }

    hasWhiteText: {
      color: white;
    }

    <Foo hasWhiteText />
  };
`)

test("Nested modifier", `
  () => {
    Foo: {
      color: red;
    }

    Bar: {
      Foo: {
        color: blue;
      }
    }

    <this>
      <Foo />
      <Bar>
        <Foo />
      </Bar>
    </this>
  };
`)

test("Explicitly use modifier", `
  () => {
    Foo: {
      color: blue;
    }

    Baz: {
      use: Foo;
      color: red;
    }

    <this>
      <Baz />
      <Foo />
    </this>
  }
`)

test("collapse single-use modifiers", `
  Bar: { color: red }

  () => {
    Bar: { background: white }
    Foo: {
      Bar: { border: red }
    }
    
    <Foo>
      <Bar />
    </Foo>
  }
`);
