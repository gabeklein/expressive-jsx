const test = require("./_adapter");

test("contingent on consequent", `
  () => do {
    if(true){
      div: {
        css: if(".foo-bar")
          background: blue;
      }
    }

    <div>Hello</div>
  }
`);

test("multiple contingent on consequent", `
  () => do {
    if(active){
      css: self: {
        if(".foo")
          color: red;
    
        if(".bar")
          color: red;
      }
    }

    <div>Hello</div>
  }
`);

test("contingent in consequent", `
  () => do {
    if(true){
      div: {
        css: if(".foo-bar")
          background: blue;
      }
    }

    <div>Hello</div>
  }
`);