import { appendUnitToN } from "./units";

const EXPORT = exports;

for(const kind of [
  "border",
  "borderTop",
  "borderLeft",
  "borderRight",
  "borderBottom",
]){
  function handler(color, width, borderStyle){
    const style = {};

    if(!width && color.indexOf(" ") > 0)
      style[kind] = color;
    else
      style[kind] = border(color, width, borderStyle);

    return { style };
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
    return { style: { outline: "none" }}

  if(b == undefined )
    return { style: { outline: `1px dashed ${a || "green"}` }}

  else
    return { attrs: { outline: this.arguments }}
}
