export function image(a){
  return {
    style: {
      backgroundImage: `url("${a}")`
    }
  }
}

export function backgroundImage(a){
  if(typeof a == "object" && !a.named)
    return { style: {
      backgroundImage: a
    }}
  else
    return { attrs: {
      backgroundImage: this.arguments
    }}
}

export function icon(mask, color){
  if(!mask) return;

  if(mask.indexOf(".svg") < 0)
    mask = mask.concat(".svg")

  const attrs = {
    WebkitMaskImage: `url(\"${mask}\")`
  }

  if(color)
    attrs.bg = color;

  return { attrs }
}