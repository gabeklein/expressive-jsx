const test = require("./_adapter");

test("strip tag; emit default", `
  () => {
    <hello>Hello World</hello>
  }
`);

test("will not emit empty tag", `
  () => {
    <foobar />
  }
`);

test("pass-though capital (component) tags", `
  () => {
    <Hello>Hello World</Hello>
  }
`);

test("pass-through HTML5 tags", `
  () => {
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
  () => {
    <Foo.Bar />
  }
`);

test("Member property implemented as name", `
  Bar: {
    color: blue;
  }

  () => {
    <Foo.Bar />
  }
`);