const test = require("./_adapter");

test("Simple modifier", `
  () => do {
    Foo: {
      color: red;
    }

    <Foo />
  };
`)

test("Attribute-based modifier", `
  () => do {
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
  () => do {
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
  () => do {
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