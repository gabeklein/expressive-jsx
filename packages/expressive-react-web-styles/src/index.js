const Mods = module.exports = {
    size,
    absolute,
    border,
    fixed
};

for(const style of [
    "top",
    "left",
    "right",
    "bottom",
    "width",
    "height",
    "maxWidth",
    "maxHeight",
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
    "outlineWidth"
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

function border(kind){
    return function (color = "black", width = 1, style = "solid"){
        width = appendUnitToN(width);

        let value = color == "none"
            ? "none"
            : [color, style, width].join(" ")

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
                args = args.slice(0,2)
            value = args.map(x => appendUnitToN(x)).join(" ")
        }

        return {
            style: { [style]: value }
        }
    }
}

function size(width, height){
    width = appendUnitToN(width);
    return {
        style: {
            width, height: appendUnitToN(height) || width
        }
    }
}

function absolute(){
    const out = _cover(...arguments);
    out.style.position = "absolute";
    return out;
}

function fixed(){
    const out = _cover(...arguments);
    out.style.position = "fixed";
    return out;
}

function _cover(){
    const [top, right, bottom, left] = 
        rect(...arguments).map(x => appendUnitToN(x))

    return {
        style: { top, right, bottom, left }
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

function nToNUnits(value) {
    return {
        style: {
            [this.name]: appendUnitToN(value)
        }
    }
}