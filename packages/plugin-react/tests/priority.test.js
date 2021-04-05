const test = require("./_adapter");

test("competing style priority", `
  Bar: { color: red };

  () => do {
    Bar: { color: blue }
    Foo: Bar: { color: orange }
    
    <Foo>
      <Bar />
    </Foo>
  };
`);