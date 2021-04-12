export function font(...args){
  const attrs = {};

  for(const x of args)
    if(x % 100 === 0)
      attrs.fontWeight = x;
    else if(isNaN(x) === false)
      attrs.fontSize = x;
    else if(typeof x === "string")
      attrs.fontFamily = x

  return { attrs }
}

export function fontFamily(){
  const fonts = this.arguments.map(quoteOnWhitespace).join(", ")

  return {
    style: {
      fontFamily: fonts
    }
  }
}

function quoteOnWhitespace(font){
  if(~font.indexOf(" "))
    return `"${font}"`

  return font
}

export { fontFamily as family }