const EXPORT = exports;

import { rect, appendUnitToN } from "./util"

export function size(x, y, unit){
    return {
        attrs: {
            width: [x,      unit], 
            height: [y || x, unit]
        }
    }
}

export function aspectSize(x, y, unit){
    const y2 = Math.abs(y);
    if(y2 && y2 < 1)
        if(y > 0) y = x, x = x * y2;
        else y = x * y2;
    return {
        attrs: {
            width: [x,      unit], 
            height: [y || x, unit]
        }
    }
}

export function radius(a){
    return {
        attrs: {
            borderRadius: a
        }
    }    
}

for (const kind of [
    "margin", 
    "padding"
]) {
    EXPORT[kind] = 
    function(a, b, c, d){
        switch(arguments.length){
            case 1: return {
                style: { [kind]: a }
            }
            case 2: return {
                style: {
                    [kind + "Vertical"]: a,
                    [kind + "Horizontal"]: b
                }
            }
            case 3: return {
                style: {
                    [kind + "Top"]: a,
                    [kind + "Horizontal"]: b,
                    [kind + "Bottom"]: c
                }
            }
            case 4: return {
                style: {
                    [kind + "Top"]: a,
                    [kind + "Right"]: b,
                    [kind + "Bottom"]: c,
                    [kind + "Left"]: d
                }
            }
        }
    }
}

for(const kind of [
    "border",
    "borderTop",
    "borderLeft",
    "borderRight",
    "borderBottom",
]){
    EXPORT[kind] = (color = "black", width = 1, style = "solid") => {
        let value = color == "none"
            ? "none"
            : [ color, style, appendUnitToN(width) ].join(" ")

        return {
            style: { [kind]: value  }
        }
    }
}