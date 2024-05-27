import { appendUnit } from "../helper/appendUnit";

function _border(dir){
  let key = "border";

  if(dir)
    key += dir[0].toUpperCase() + dir.slice(1);

  return (color, width, style) => {
    if(color == "none" || color == "transparent")
      return {
        [key]: color
      };
  
    return {
      [key]: [
        color || "black",
        style || "solid",
        appendUnit(width || "1")
      ]
    };
  }
}

export const border = _border();
export const borderTop = _border("top");
export const borderLeft = _border("left");
export const borderRight = _border("right");
export const borderBottom = _border("bottom");

export {
  borderTop as borderT,
  borderLeft as borderL,
  borderRight as borderR,
  borderBottom as borderB
}
