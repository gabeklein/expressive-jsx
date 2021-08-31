const test = require("./_adapter");

test("competing style priority", `
  Bar: { color: red };

  () => do {
    Bar: { color: blue }
    Foo: {
      Bar: { color: orange }
    }
    
    <Foo>
      <Bar />
    </Foo>
  };
`);

test("conditional priority should be higher", `
  () => do {
    if(checked)
      test: {
        color: red;
      }

    test: {
      color: green;
    }

    <test />
}
`);

test("prioritize external (capital-letter) define", `
  const Foo = () => do {
    forward: className;
    color: red;

    <this>Hello</this>
  }

  const Bar = () => do {
    Foo: {
      color: blue;
    }
    
    <Foo />
  }
`);