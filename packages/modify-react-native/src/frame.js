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

export function width(x, unit){
    return {
        style: {
            width: unit ? x + unit.toString() : x
        }
    }
}

export function height(y, unit){
    return {
        style: {
            height: unit ? y + unit.toString() : y
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
    for(const dir of ["Horizontal", "Vertical"])
        EXPORT[kind + dir[0]] = 
        EXPORT[kind + dir] =
            dir == "Horizontal"
            ? (a, b) => recombine.call({ arguments: {length: 4}}, null, b || a, null, a)
            : (a, b) => recombine.call({ arguments: {length: 3}}, a, null, b || a)
    
    EXPORT[kind] = recombine;
    
    function recombine(a, b, c, d){
        switch(this.arguments.length){
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
])
EXPORT[kind] = (color, width) => {
    return {
        style: { 
            [kind + "Color"]: color || "black",
            [kind + "Width"]: width || 1
        }
    }
}