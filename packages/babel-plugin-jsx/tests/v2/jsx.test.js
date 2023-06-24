describe("implicit return", () => {
  transform("arrow function", `
    () => {
      <this>Hello World</this>
    }
  `)

  transform("with statements", `
    () => {
      const [x, setX] = useState();
      
      useEffect(() => {
        void x;
        setX();
      }, []);

      <div />
    }
  `)

  transform("function declaration", `
    function App() {
      <this>Hello World</this>
    }
  `)

  transform("function expression", `
    const App = function() {
      <this>Hello World</this>
    }
  `)
});

describe("children", () => {
  transform("fragment", `
    () => {
      <>
        <div>Foo</div>
        <div>Bar</div>
      </>
    }
  `)

  transform("multiple", `
    () => {
      <this>
        <div>Foo</div>
        <div>Bar</div>
      </this>
    }
  `)
})

describe("MemberExpression tags", () => {
  transform("will passthru", `
    () => {
      <Foo.Bar />
    }
  `);

  transform("will apply modifiers", `
    () => {
      Bar: {
        color: red;
      }
      
      <Foo.Bar />
    }
  `)
})