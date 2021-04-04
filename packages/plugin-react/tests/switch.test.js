const test = require("./_adapter");

test("basic switch", `
  ({ hello }) => do {
    if(hello)
      <div>Hello World</div>
    else
      <div>Goodbye World</div>
  }
`);

test("switch styles", `
  ({ foo }) => do {
    if(foo)
      color: red;
    else
      color: blue;
  }
`);

test("alternate consequent types", `
  ({ foo }) => do {
    if(foo)
      color: red;
    else
      <div>Foo is false</div>
  }
`);

test("inverse consequent types", `
  ({ foo }) => do {
    if(foo)
      <div>Foo is true</div>
    else
      color: red;
  }
`);

test("supports complex else-if", `
  ({ foo, bar }) => do {
    if(foo)
      <div>Foo is true</div>
    else if(bar)
      <div>Bar is true</div>
    else
      color: red;
  }
`);

test("supports inverse else-if", `
  ({ foo, bar }) => do {
    if(foo)
      color: red;
    else if(bar)
      color: blue;
    else
      <div>Foo & Bar are false</div>
  }
`);




