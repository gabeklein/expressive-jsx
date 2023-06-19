transform("will convert `./../file.ext` to require", `
  () => {
    <img src="./logo.svg">
      This should be a require-sourced file!
    </img>
  }
`);