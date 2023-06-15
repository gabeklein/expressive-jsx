const test = require("./_adapter");

test("component", `
  () => {
    <div>Hello World</div>
  }
`);

test("multiple", `
  () => {
    <this>
      <div>Foo</div>
      <div>Bar</div>
    </this>
  }
`);

test("statement pass-thru", `
  () => {
    const [x, setX] = useState();

    useEffect(() => {
      void x;
      setX();
    }, []);
    
    <div />
  }
`)