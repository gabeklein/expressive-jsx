transform("component", `
  () => {
    <div>Hello World</div>
  }
`);

transform("multiple", `
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