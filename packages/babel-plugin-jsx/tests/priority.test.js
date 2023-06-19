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

transform("conditional priority should be higher", `
  () => {
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

transform("prioritize external (capital-letter) define", `
  const Foo = () => {
    forward: className;
    color: red;

    <this>Hello</this>
  }

  const Bar = () => {
    Foo: {
      color: blue;
    }
    
    <Foo />
  }
`);