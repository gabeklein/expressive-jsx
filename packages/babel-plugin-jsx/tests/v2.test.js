transform("whatever", `
  const App = () => {
    margin: 20;

    <this>Hello World</this>
  }
`)

transform("nested style", `
  const App = () => {
    child: {
      margin: 20;
    }

    <child>Hello World</child>
  }
`)