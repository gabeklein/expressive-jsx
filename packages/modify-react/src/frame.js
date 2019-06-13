const EXPORT = exports;

import { rect, appendUnitToN, handleUnits } from "./util"

const sides = {
    top: [1, 1, 0, 0],
    left: [1, 0, 0, 1],
    right: [0, 1, 1, 0],
    bottom: [0, 0, 1, 1]
}

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

export function radius(a, r1, r2){
    if(a == "round")
        a = 999;
    else 
    if(typeof a == "string" && r1){
        let [x, y] = a.split('-');
        x = sides[x];
        if(y)
            x = x.map((x, i) => sides[y][i] ? x : 0);

        a = x.map((r, i) => {
            if(r){
                let val = i && r2 || r1;
                if(isNaN(val) == false)
                    val += Math.round(val) != val
                        ? "em" : "px"
                return val;
            }
            else 
                return 0;
        }).join(" ")
    }

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