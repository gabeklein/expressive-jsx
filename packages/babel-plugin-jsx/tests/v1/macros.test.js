transform("output attributes", `
  () => {
    bg: red;
    
    <this />
  };
`);

transform("output style of same name", `
  () => {
    marginH: 20;

    <this>Hello World</this>
  };
`)