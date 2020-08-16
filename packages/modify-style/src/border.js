import { appendUnitToN } from "./units";

const EXPORT = exports;

for(const kind of [
  "border",
  "borderTop",
  "borderLeft",
  "borderRight",
  "borderBottom",
]){
  const handler = EXPORT[kind] = (color, width, style) => {
    if(!width && color.indexOf(" ") > 0) 
      return {
        style: { [kind]: color  }
      }

    if(color === undefined) color = "black";
    if(width === undefined) width = 1;
    if(style === undefined) style = "solid"
    let value = color == "none"
      ? "none"
      : [ color, style, appendUnitToN(width) ].join(" ")

    return {
      style: { [kind]: value  }
    }
  }

  if(kind[6])
    EXPORT[kind.slice(0, 7)] = handler;
}

export function outline(a, b){
  return a == "none"     ? {style: { outline: "none" }}
    :  b == undefined  ? {style: { outline: `1px dashed ${a || "green"}` }}
    :  {attrs: { outline: this.arguments }}
}
