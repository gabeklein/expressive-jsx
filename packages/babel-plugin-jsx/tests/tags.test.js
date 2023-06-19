transform("strip tag; emit default", `
  () => {
    <hello>Hello World</hello>
  }
`);

transform("pass-though capital (component) tags", `
  () => {
    <Hello>Hello World</Hello>
  }
`);

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

transform("Handle member-type tags", `
  () => {
    <Foo.Bar />
  }
`);

transform("Member property implemented as name", `
  () => {
    Bar: {
      color: blue;
    }

    <Foo.Bar />
  }
`);