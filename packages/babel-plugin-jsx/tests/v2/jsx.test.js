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
    function App(){
      <this>Hello World</this>
    }
  `)

  transform("function expression", `
    const App = function(){
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

describe("explicit tag", () => {
  transform("pass-through HTML tags", `
    () => {
      <div>
        <uncommon />
        <blockquote />
        <input />
        <h1 />
        <h2 />
        <h3 />
        <h4 />
        <h5 />
        <h6 />
        <p />
        <a />
        <ul />
        <ol />
        <li />
        <i />
        <b />
        <em />
        <strong />
        <span />
        <hr />
        <img />
        <div />
        <br />
      </div>
    }
  `);

  transform("pass svg tags", `
    () => {
      <svg>
        <path />
        <circle />
        <rect />
        <g />
        <defs />
        <clipPath />
        <linearGradient />
        <stop />
        <radialGradient />
        <text />
        <tspan />
        <textPath />
        <image />
        <pattern />
        <marker />
        <use />
        <symbol />
        <polyline />
        <polygon />
        <line />
        <ellipse />
        <foreignObject />
      </svg>
    }
  `)

  transform("only pass svg tags within svg", `
    () => {
      <div>
        <path />
      </div>
    }
  `)

  transform("pass-through capital (component) tags", `
    () => {
      <Hello>Hello World</Hello>
    }
  `);

  transform("pass-through MemberExpression tags", `
    () => {
      <this>
        <Foo.Bar />
        <Foo.Bar.Baz />
      </this>
    }
  `);

  transform("pass-through lowercase MemberExpression tags", `
    () => {
      <foo.bar />
    }
  `);

  transform("will apply modifier for property-name", `
    () => {
      Bar: {
        color: red;
      }
      
      <>
        <Foo.Baz.Bar />
        <Foo.Bar />
      </>
    }
  `)
})