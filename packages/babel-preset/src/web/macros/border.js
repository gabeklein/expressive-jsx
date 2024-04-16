import { appendUnitToN } from '../util';

function factory(dir){
  let key = "border";

  if(dir)
    key += dir[0].toUpperCase() + dir.slice(1);

  return (color, width, style) => {
    if(color == "none" || color == "transparent" || !(2 in arguments))
      return {
        [key]: color
      };
  
    return {
      [key]: [
        color || "black",
        style || "solid",
        appendUnitToN(width || "1")
      ]
    };
  }
}

const border = factory();
const borderTop = factory("top");
const borderLeft = factory("left");
const borderRight = factory("right");
const borderBottom = factory("bottom");

export {
  border,
  borderTop,
  borderTop as borderT,
  borderLeft,
  borderLeft as borderL,
  borderRight,
  borderRight as borderR,
  borderBottom,
  borderBottom as borderB
}
