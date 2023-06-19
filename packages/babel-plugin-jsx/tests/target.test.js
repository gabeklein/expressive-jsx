transform("Simple modifier", `
  () => {
    Foo: {
      color: red;
    }

    <Foo />
  };
`)

transform("Attribute-based modifier", `
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

transform("Nested modifier", `
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

transform("Explicitly use modifier", `
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

// TODO - reimplement
// transform("collapse single-use modifiers", `
//   Bar: { color: red }

//   () => {
//     Bar: { background: white }
//     Foo: {
//       Bar: { border: red }
//     }
    
//     <Foo>
//       <Bar />
//     </Foo>
//   }
// `);
