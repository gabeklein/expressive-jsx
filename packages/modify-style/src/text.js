export function font(){
  const attrs = {};

  for(const arg of this.arguments)
    if(arg % 100 === 0)
      attrs.fontWeight = arg;
    else if(isNaN(arg) === false)
      attrs.fontSize = arg;
    else if(typeof arg === "string")
      attrs.fontFamily = arg

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