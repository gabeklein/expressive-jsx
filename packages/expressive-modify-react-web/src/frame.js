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
    for (const [direction, a, b] of [
        ["Vertical", "Top", "Bottom"],
        ["Horizontal", "Left", "Right"] 
    ])
    EXPORT[kind + direction] = 
        (aIn, bIn) => ({
            attrs: {
                [kind + a]: aIn,
                [kind + b]: bIn || aIn
            }
        })

    EXPORT[kind] = 
        function(keyword){
            let value;
            const args = this.arguments;

            if(args.length == 1 && keyword == "auto" || keyword == "none" || / /.test(keyword))
                value = keyword
            else {
                let args = rect(...args);
                if(args.length == 2)
                    args = args.slice(0, 2)
                value = args.map(x => appendUnitToN(x)).join(" ")
            }

            return {
                style: { [kind]: value }
            }
        }
}

export function outline(a, b){
    return a == "none"     ? {style: { outline: "none" }}
        :  b == undefined  ? {style: { outline: `1px dashed ${a || "green"}` }}
        :  {attrs: { outline: this.arguments }}
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