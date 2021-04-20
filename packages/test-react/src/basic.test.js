const test = require("./_adapter");

test("component", `
  () => do {
    <div>Hello World</div>
  }
`);

test("multiple", `
  () => do {
    <this>
      <div>Foo</div>
      <div>Bar</div>
    </this>
  }
`);

test("statement pass-thru", `
  () => do {
    const [x, setX] = useState();

    useEffect(() => {
      void x;
      setX();
    }, []);
    
    <div />
  }
`)