import { appendUnitToN } from '../util';

function factory(dir){
  const key = dir
    ? "border" + dir[0].toUpperCase() + dir.slice(1)
    : "border";

  return function handler(color, width, borderStyle){
    return {
      [key]: !width && color.indexOf(" ") > 0
        ? color
        : _border(color, width, borderStyle)
    }
  }
}

function _border(
  color = "black",
  width = 1,
  style = "solid"){

  if(color == "none")
    return "none";
  else {
    width = appendUnitToN(width);
    return [ color, style, width ].join(" ");
  }
}

const border = factory();
const borderTop = factory("top");
const borderLeft = factory("left");
const borderRight = factory("right");
const borderBottom = factory("bottom");

function outline(a, b){
  if(a == "none")
    return {
      outline: "none"
    }

  if(b == undefined)
    return {
      outline: `1px dashed ${a || "green"}`
    }

  const outline = Array.from(arguments)
    .map(x => typeof x == "number" ? `${x}px` : x)
    .join(" ");

  return {
    outline
  }
}

export {
  border,
  borderTop,
  borderLeft,
  borderRight,
  borderBottom,
  borderTop as borderT,
  borderLeft as borderL,
  borderRight as borderR,
  borderBottom as borderB,
  outline
}
