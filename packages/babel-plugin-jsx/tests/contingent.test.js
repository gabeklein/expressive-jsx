transform("contingent on consequent", `
  () => {
    if(true){
      div: {
        css: if(".foo-bar")
          background: blue;
      }
    }

    <div>Hello</div>
  }
`);

transform("multiple contingent on consequent", `
  () => {
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

transform("contingent in consequent", `
  () => {
    if(true){
      inner: {
        css: if(".foo-bar")
          background: blue;
      }
    }

    <this>
      <inner>Hello</inner>
    </this>
  }
`);