const EXPORT = exports;

import { rect, appendUnitToN, handleUnits } from "./util"

for(const type of ["min", "max", ""]){
    const size = type ? `${type}Size` : "size";
    const width = type ? `${type}Width` : "width";
    const height = type ? `${type}Height` : "height";

    EXPORT[size] = (x, y, unit) => {
        if(typeof y == "string" 
        && typeof x == "number")
            unit = y, y = null;

        return {
            attrs: {
                [width]: [x,      unit], 
                [height]: [y || x, unit]
            }
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
    if(a == "round")
        a = 999;
        
    return {
        attrs: {
            borderRadius: a
        }
    }    
}

export function circle(a){
    return {
        attrs: {
            borderRadius: a / 2,
            size: a
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
    EXPORT[kind + direction] = // marginHorizontal
    EXPORT[kind + direction[0]] = // marginH
        (aIn, bIn) => ({
            attrs: {
                [kind + a]: aIn,
                [kind + b]: bIn || aIn
            }
        })

    for(const side of ["Top", "Left", "Right", "Bottom"])
        EXPORT[kind + side] = 
        EXPORT[kind + side[0]] = 
            handleUnits(kind + side)  

    EXPORT[kind] = 
        function(keyword){
            let value;
            
            if(this.arguments.length == 1 && keyword == "auto" || keyword == "none" || / /.test(keyword))
                value = keyword
            else {
                let args = rect(...this.arguments);
                if(args.length == 2)
                    args = args.slice(0, 2)
                value = args.map(x => appendUnitToN(x)).join(" ")
            }

            return {
                style: { [kind]: value }
            }
        }
}

export function shadow(color, radius = 10, x = 2, y = x){
    return {
        style: {
            boxShadow: `${x}px ${y}px ${radius}px ${color}`
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