transform("component", `
  () => {
    <div>Hello World</div>
  }
`);

transform("multiple children", `
  () => {
    <this>
      <div>Foo</div>
      <div>Bar</div>
    </this>
  }
`);

transform("statement pass-thru", `
  () => {
    const [x, setX] = useState();

    useEffect(() => {
      void x;
      setX();
    }, []);
    
    <div />
  }
`)

transform("basic style", `
  () => {
    color: green;

    <this>Hello World</this>
  };
`);