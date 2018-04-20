const Mods = module.exports = {
    size,
    absolute,
    border,
    fixed,
    relative,
    backgroundImage,
    zIndex,
    outline,
    font,
    aspRect
};

function zIndex(a){
    return {
        style: { zIndex: a }
    }
}

function outline(a, b){
    return a == "none"     ? {style: { outline: "none" }}
        :  b == undefined  ? {style: { outline: `1px dashed ${a || "green"}` }}
        :  {attrs: { outline: Array.from(arguments) }}
}

function font(a, b = null){
    return {
        attrs: {
            fontSize: a,
            fontWeight: b
        }
    }
}

for(const style of [
    "top",
    "left",
    "right",
    "bottom",
    "width",
    "height",
    "maxWidth",
    "maxHeight",
    "minWidth",
    "minHeight",
    "marginTop",
    "marginBottom",
    "marginLeft",
    "marginRight",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "paddingBottom",
    "fontSize",
    "lineHeight",
    "outlineWidth",
    "borderRadius",
    "backgroundSize"
]) Mods[style] = nToNUnits;

for(const style of [
    "margin",
    "padding"
]) Mods[style] = spacing(style)

for(const kind of [
    "border",
    "borderTop",
    "borderLeft",
    "borderRight",
    "borderBottom",
]) Mods[kind] = border(kind)

for(const kind of [
    "padding",
    "margin"
]) 
for(let [direction, a, b] of [
    ["Vertical", "Top", "Bottom"],
    ["Horizontal", "Left", "Right"] 
])
{
    a = kind + a;
    b = kind + b;
    Mods[kind + direction] = (aIn, bIn) => ({
        attrs: {
            [a]: aIn,
            [b]: bIn || aIn
        }
    })
}

function backgroundImage(a){
    if(typeof a == "object" && !a.named)
        return { style: {
            backgroundImage: a
        }}
    else 
        return { attrs: {
            backgroundImage: Array.from(arguments)
        }} 
}

function border(kind){
    return function (color = "black", width = 1, style = "solid"){

        let value = color == "none"
            ? "none"
            : [ color, style, appendUnitToN(width) ].join(" ")

        return {
            style: { [kind]: value  }
        }
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

function size(x, y, unit){
    return {
        attrs: {
            width: [x,      unit], 
            height: [y || x, unit]
        }
    }
}

function aspRect(x, y, unit){
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
        : _cover(...arguments);
        
    return out
}

function absolute(a){
    const out = position(...arguments)
    out.style = {position: "absolute"};
    return out;
}

function fixed(){
    const out = position(...arguments);
    out.style = {position: "fixed"};
    return out;
}

function relative(){
    return {
        style: {position: "relative"}
    };
}

function _cover(){
    const [top, right, bottom, left] = rect(...arguments)
    return {
        attrs: { top, right, bottom, left }
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

    return [top, right, bottom, left]
}

function nToNUnits(value, unit) {
    return {
        style: {
            [this.name]: appendUnitToN(value, unit)
        }
    }
}

function appendUnitToN(val, unit = "px") {
    return (
        typeof val == "number" 
            ? val == 0 
                ? "0"
                : val + unit
        : typeof val == "undefined"
            ? ""
            : val
    )
}