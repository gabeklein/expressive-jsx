const Mods = module.exports = {
    size,
    absolute,
    fixed
};

function pxStyleSimple(value, unit) {
    if(typeof value == "string"); else
    if(typeof value != "number") throw ({
        index: 0,
        message: "TypeError: argument must be number or string with unit value."
    });
    else value = `${value}${typeof unit == "string" ? unit : "px"}`

    return {
        style: {
            [this.name]: value
        }
    }
}

function size(value){
    if(typeof value == "number")
        value = value.toString() + "px";
    return {
        style: {
            width: value,
            height: value
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
    const { length } = arguments;
    const args = Array.from(arguments).map(x => {
        return x ? x + "px" : "0"
    })

    let top, left, right, bottom;
    let [a = "0", b, c, d] = args;

    switch(arguments.length){
        case 0:
        case 1:
            top = left = right = bottom = a;
            break;
        case 2: 
            top = bottom = a
            left = right = b
            break;
        case 3:
            top = a
            left = right = b
            bottom = c
            break
        case 4:
            [top, right, bottom, left] = arguments;
            break;
    }
    
    return {
        style: {
            left, right, top, bottom
        }
    }
}

for(const style of [
    "width",
    "height",
    "maxWidth",
    "maxHeight",
    "margin",
    "marginTop",
    "marginBottom",
    "marginLeft",
    "marginRight",
    "padding",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "paddingBottom",
    "fontSize",
    "lineHeight"
]){
    Mods[style] = pxStyleSimple;
}
