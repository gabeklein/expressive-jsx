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
  return {
    fontFamily: Array.from(arguments).map(quoteIfWhitespace).join(", ")
  }
}

function quoteIfWhitespace(font){
  return ~font.indexOf(" ") ? `"${font}"` : font;
}

export { fontFamily as family }