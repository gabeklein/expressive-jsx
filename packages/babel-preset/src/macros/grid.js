export function gridArea(...args){
  if(args.length == 2)
    return {
      gridRow: recombineSlash(args[0]),
      gridColumn: recombineSlash(args[1])
    }
}

export function gridRow(...args){
  return {
    gridRow: recombineSlash(args)
  }
}

export function gridColumn(...args){
  return {
    gridColumn: recombineSlash(args)
  }
}

export function gridRows(...args){
  return {
    display: "grid",
    gridTemplateRows: recombineTemplate(args)
  }
}

export function gridColumns(...args){
  return {
    display: "grid",
    gridTemplateColumns: recombineTemplate(args)
  }
}

function recombineSlash(args){
  args = [].concat(args)

  if(args[0] !== "-")
    return args[0];

  let layer = args;
  let x = "";

  while(true){
    x = x + " / " + layer[2];

    if(Array.isArray(layer[1]))
      layer = layer[1]
    else
      return layer[1] + x;
  }
}

function recombineTemplate(args){
  return args.map(formatGridValue).join(" ")
}

function formatGridValue(x){
  if(typeof x == "number")
    return x + "px";

  if(typeof x !== "string")
    throw new Error("Unexpected value for grid")

  if(/^\d+\.\d+$/.test(x))
    return x + "fr"

  if(x == "min" || x == "max")
    return x + "-content"

  return x;
}