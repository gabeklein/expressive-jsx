import { appendUnitToN } from './units';

const EXPORT = exports;

for(const kind of [
  "border",
  "borderTop",
  "borderLeft",
  "borderRight",
  "borderBottom",
]){
  function handler(color, width, borderStyle){
    return {
      [kind]: !width && color.indexOf(" ") > 0
        ? color
        : border(color, width, borderStyle)
    }
  }

  EXPORT[kind] = handler;

  if(kind[6]){
    const shortName = kind.slice(0, 7);
    EXPORT[shortName] = handler;
  }
}

function border(
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

export function outline(a, b){
  if(a == "none")
    return { outline: "none" }

  if(b == undefined)
    return { outline: `1px dashed ${a || "green"}` }

  return {
    outline: Array.from(arguments)
    .map(x => typeof x == "number" ? `${x}px` : x)
    .join(" ")
  }
}
