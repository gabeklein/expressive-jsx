const EXPORT = exports;

export * from "./flex"

export { rgba as rgb }

export function rgba(r,g,b,a = 1){
    for(const x of [r,g,b])
        if(typeof x != "number") 
            throw new Error("malformed arguments in rgb statement")

    const rgb = [r,g,b].join(",");
    return {
        value: a == 1 ? `rgb(${rgb})` : `rgba(${rgb},${a})`
    }
}

export function source(a){
    return {
        style: {
            source: {
                require: a
            }
        }
    }
}

export function font(a, b = null){
    return {
        attrs: {
            fontSize: a,
            fontWeight: b
        }
    }
}

export function size(x, y, unit){

    if(unit)
        x = x && [x, unit] || null,
        y = y && [y, unit];

    return {
        attrs: {
            width: x , 
            height: y || x
        }
    }
}

export function fontWeight(a){
    return {
        style: {
            fontWeight: a.toString()
        } 
    }
}

export function absolute(a, b){
    const keyword = a.split("-");

    let out = {
        attrs: {}
    };
    
    if(keyword.length == 2)
        for(const dir of keyword)
            out.attrs[dir] = 0
    else if(a == "fill"){
        const margin = b || 0;
        out.attrs = {
            top: margin,
            left: margin,
            right: margin,
            bottom: margin
        }
    }
    else 
        out = position(...arguments)

    out.style = {position: "absolute"};

    return out;
}

function position(){
    let data = {};
    if(typeof a != "number")
    for(const item of arguments)
        if(item.named)
            data[item.named] = item.inner[0]
        else {
            data = null;
            break;
        }

    const out = data 
        ? { attrs: data } 
        : rect(...arguments);
        
    return out
}

for (const kind of [ "margin", "padding" ]) {
    EXPORT[kind] = spacing(kind)

    for (let [direction, a, b] of [
        ["Vertical", "Top", "Bottom"],
        ["Horizontal", "Left", "Right"] 
    ])
    EXPORT[kind + direction] = function(aIn, bIn){
        return {
            attrs: bIn === undefined
            ? {
                [kind + direction]: aIn
            } : {
                [kind + a]: aIn,
                [kind + b]: bIn
            }
        }
    }
}

function rect(a, b, c, d){
    const { length } = arguments;
    let top, left, right, bottom;

    switch(arguments.length){
        case 0:
            a = 0
        case 1:
            top = left = right = bottom = a;
            break;
        case 2: 
            top = bottom = a
            left = right = b
            break;
        case 3:
            top = a
            bottom = c
            left = right = b
            break
        case 4:
            return Array.from(arguments);
        default:
            throw new Error("Too many arguments for css 4-way value.")
    }

    return {
        attrs: { top, right, bottom, left }
    }
}

function spacing(style){
    return function(keyword){
        let value 

        if(arguments.length == 1 && keyword == "auto" || keyword == "none" || / /.test(keyword))
            value = keyword
        else {
            let args = rect(...arguments);
            if(arguments.length == 2)
                args = args.slice(0, 2)
            value = args.map(x => appendUnitToN(x)).join(" ")
        }

        return {
            style: { [style]: value }
        }
    }
}