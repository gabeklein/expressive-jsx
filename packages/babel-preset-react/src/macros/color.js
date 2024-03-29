function background(a){
  if(Array.isArray(a)){
    const [ head, ...tail ] = a;

    switch(head){
      case "rgb":
      case "rgba": {
        const { value } = rgba(...tail);
      
        return {
          backgroundColor: value
        };
      }

      case "hsl":
      case "hsla": {
        const { value } = hsla(...tail);
        return {
          backgroundColor: value
        };
      }
    }
  }

  return {
    background: Array.from(arguments)
  }
}

export {
  background,
  background as bg
}

function rgba(r, g, b, a = 1){
  for(const x of [r,g,b])
    if(typeof x != "number")
      throw new Error("malformed arguments in rgb statement")

  const rgb = [r,g,b].join(",");

  return {
    value: a == 1 ? `rgb(${rgb})` : `rgba(${rgb},${a})`
  }
}

function hsla(h, s, l, a = 1){
  for(const x of [h,s,l])
    if(typeof x != "number")
      throw new Error("malformed arguments in hsl statement")

  const hsl = [ h, s+"%", l+"%" ].join(",");

  return {
    value: a == 1 ? `hsl(${hsl})` : `hsla(${hsl},${a})`
  }
}