function withPrefix(prefix){
  const width = prefix ? `${prefix}Width` : "width";
  const height = prefix ? `${prefix}Height` : "height";

  return function size(x, y, unit){
    if(typeof y == "string" && typeof x == "number"){
      unit = y;
      y = null;
    }
  
    return {
      [width]: [x, unit],
      [height]: [y || x, unit]
    }
  }
}

export const size = withPrefix();
export const minSize = withPrefix("min");
export const maxSize = withPrefix("max");

export function aspectSize(x, y, unit){
  const y2 = Math.abs(y);

  if(y2 && y2 < 1)
    if(y <= 0)
      y = x * y2;
    else {
      y = x;
      x *= y2;
    }

  return {
    width: [x, unit],
    height: [y || x, unit]
  }
}