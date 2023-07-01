transform("basic switch", `
  ({ hello }) => {
    if(hello)
      <div>Hello World</div>
    else
      <div>Goodbye World</div>
  }
`);

transform("switch styles", `
  ({ foo }) => {
    if(foo)
      color: red;
    else
      color: blue;
  }
`);

transform("alternate consequent types", `
  ({ foo }) => {
    if(foo)
      color: red;
    else
      <div>Foo is false</div>
  }
`);

transform("inverse consequent types", `
  ({ foo }) => {
    if(foo)
      <div>Foo is true</div>
    else
      color: red;
  }
`);

transform("supports complex else-if", `
  ({ foo, bar }) => {
    if(foo)
      <div>Foo is true</div>
    else if(bar)
      <div>Bar is true</div>
    else
      color: red;
  }
`);

transform("supports inverse else-if", `
  ({ foo, bar }) => {
    if(foo)
      color: red;
    else if(bar)
      color: blue;
    else
      <div>Foo & Bar are false</div>
  }
`);

transform("nested elements may have conditional", `
  const BuyButton = ({ active }) => {
    inner: {
      if(active)
        color: red;
      else
        color: green;
    }

    <container>
      <nested>
        <inner />
      </nested>
    </container>
  }
`)

transform("switch can provide style downstream", `
  () => {
    if(true){
      foo: { color: red }
      bar: { color: blue }
    }

    <this>
      <foo />
      <bar />
    </this>
  }
`)

transform("handle both children and styles", `
  () => {
    color: red;

    if(true)
      <html-switch-true />
    else {
      color: green;
      
      <html-switch-false />
    }

    <conatiner />
  }
`)

// transform("delegates definition via use", `
//   example: {
//     color: black;
//   }

//   exampleActive: {
//     color: blue;
//   }

//   const BuyButton = ({ active }) => {
//     example: {
//       if(active)
//         use: exampleActive;
//       else
//         color: green;
//     }

//     <example>Hello World!</example>
//   }
// `)

// transform("delegated variant may still contain style", `
//   exampleActive: {
//     color: blue;
//   }

//   const BuyButton = ({ active }) => {
//     example: {
//       if(active){
//         use: exampleActive;
//         background: white;
//       }
//       else
//         color: green;
//     }

//     <example>Hello World!</example>
//   }
// `)



