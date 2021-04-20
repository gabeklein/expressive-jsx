const test = require("./_adapter");

test("strip tag; emit default", `
  () => do {
    <hello>Hello World</hello>
  }
`);

test("pass-though capital (component) tags", `
  () => do {
    <Hello>Hello World</Hello>
  }
`);

test("pass-through HTML5 tags", `
  () => do {
    <div>
      <uncommon />
      <article />
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

test("Handle member-type tags", `
  () => do {
    <Foo.Bar />
  }
`);

test("Member property implemented as name", `
  Bar: {
    color: blue;
  }

  () => do {
    <Foo.Bar />
  }
`);