const { from, isArray } = Array;

export function gridArea(){
  const args = from(arguments);
  if(args.length == 2){
    const r = {
      style: {
        gridRow: recombineSlash(args[0]),
        gridColumn: recombineSlash(args[1])
      }
    }
    return r;
  }
}

export function gridRow(){
  const args = from(arguments);
  return {
    style: {
      gridRow: recombineSlash(args)
    }
  }
}

export function gridColumn(){
  const args = from(arguments);
  return {
    style: {
      gridColumn: recombineSlash(args)
    }
  }
}

export function gridRows(){
  const args = from(arguments);

  return {
    style: {
      display: "grid",
      gridTemplateRows: recombineTemplate(args)
    }
  }
}

export function gridColumns(){
  const args = from(arguments);
  
  return {
    style: {
      display: "grid",
      gridTemplateColumns: recombineTemplate(args)
    }
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

    if(isArray(layer[1]))
      layer = layer[1]
    else {
      layer = layer[1] + x;
      break;
    }
  }

  return layer;
}

function recombineTemplate(args){
  return args.map(formatGridValue).join(" ")
}

function formatGridValue(x){
  if(typeof x == "number")
    return `${x}px`;

  if(typeof x !== "string")
    throw new Error("Unexpected value for grid")

  if(/^\d+\.\d+$/.test(x))
    return `${x}fr`

  if(x == "min" || x == "max")
    return `${x}-content`

  return x;
}