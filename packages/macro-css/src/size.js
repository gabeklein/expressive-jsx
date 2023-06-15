const EXPORT = exports;

for(const type of ["min", "max", ""]){
  const size = type ? `${type}Size` : "size";
  const width = type ? `${type}Width` : "width";
  const height = type ? `${type}Height` : "height";

  EXPORT[size] = (x, y, unit) => {
    if(typeof y == "string" && typeof x == "number"){
      unit = y;
      y = null;
    }

    return {
      attrs: {
        [width]: [x, unit],
        [height]: [y || x, unit]
      }
    }
  }
}

export function aspectSize(x, y, unit){
  const y2 = Math.abs(y);

  if(y2 && y2 < 1)
    if(y <= 0)
      y = x * y2;
    else {
      y = x;
      x = x * y2;
    }

  return {
    attrs: {
      width: [x, unit],
      height: [y || x, unit]
    }
  }
}