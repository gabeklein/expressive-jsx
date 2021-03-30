const test = require("./_adapter");

test("strip tag; emit default", `
  () => do {
    <hello> Hello World </hello>
  }
`);

test("pass-though capital (component) tags", `
  () => do {
    <Hello> Hello World </Hello>
  }
`);

test("pass-through HTML5 tags", `
  () => do {
    <div>
      <uncommon> ... </uncommon>
      <article> ... </article>
      <blockquote> ... </blockquote>
      <input> ... </input>
      <h1> ... </h1>
      <h2> ... </h2>
      <h3> ... </h3>
      <h4> ... </h4>
      <h5> ... </h5>
      <h6> ... </h6>
      <p> ... </p>
      <a> ... </a>
      <ul> ... </ul>
      <ol> ... </ol>
      <li> ... </li>
      <i> ... </i>
      <b> ... </b>
      <em> ... </em>
      <strong> ... </strong>
      <span> ... </span>
      <hr> ... </hr>
      <img> ... </img>
      <div> ... </div>
      <br> ... </br>
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