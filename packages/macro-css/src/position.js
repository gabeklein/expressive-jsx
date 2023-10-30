function absolute(...args){
  return position("absolute", ...args);
}

function fixed(...args){
  return position("fixed", ...args);
}

function relative(){
  return {
    position: "relative"
  };
}

export {
  absolute,
  fixed,
  relative
};

const INVERSE = {
  top: "bottom",
  left: "right",
  right: "left",
  bottom: "top"
}

function position(kind, a, b = 0, c = b){
  const out = {
    position: kind,
    top: b,
    left: c,
    right: c,
    bottom: b
  };

  if(a == "fill")
    return out;

  if(typeof a == "string"){
    const [k1, k2] = a.split("-");

    if(k2){
      if(k1 == "fill")
        delete out[INVERSE[k2]]

      else
        for(const dir of [k1, k2])
          delete out[INVERSE[dir]]

      return out
    }
  }

  let data = {};

  if(typeof a != "number")
    for(const item of [a, b, c, d])
      if(item.named)
        data[item.named] = item.inner[0];
      else {
        data = null;
        break;
      }

  if(data)
    return data;

  let top;
  let left;
  let right;
  let bottom;

  switch(args.length){
    case 0:
      a = 0
    case 1:
      top = right = bottom = left = a;
    break;

    case 2:
      top = bottom = a
      left = right = b
    break;

    case 3:
      top = a
      bottom = c
      left = right = b
    break;

    case 4:
      top = a
      right = b
      bottom = c
      left = d
    break;

    default:
      throw new Error("Too many arguments for css 4-way value.")
  }

  return {
    position: kind,
    top,
    right,
    bottom,
    left
  }
}
