export function font(...args){
  const output = {};

  for(const x of args)
    if(x % 100 === 0)
      output.fontWeight = x;
    else if(isNaN(x) === false)
      output.fontSize = x;
    else if(typeof x === "string")
      output.fontFamily = x

  return output;
}

export function fontFamily(...args){
  return {
    fontFamily: Array.from(args).map(quoteIfWhitespace).join(", ")
  }
}

function quoteIfWhitespace(font){
  return ~font.indexOf(" ") ? `"${font}"` : font;
}

export { fontFamily as family }