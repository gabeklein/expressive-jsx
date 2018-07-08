import { rect } from "./util"

export function zIndex(a){
    return {
        style: { zIndex: a }
    }
}

export function absolute(a){
    const out = keyedPosition(...this.arguments)
    out.style = {position: "absolute"};
    return out;
}

export function fixed(){
    const out = keyedPosition(...this.arguments);
    out.style = {position: "fixed"};
    return out;
}

export function relative(){
    return {
        style: {position: "relative"}
    };
}

const OPPOSITE = {
    top: "bottom",
    left: "right",
    right: "left",
    bottom: "top"
}

function keyedPosition(a, b = 0, c = b){
    let keyword;

    let out = {
        attrs: {
            top: b,
            left: c,
            right: c,
            bottom: b
        }
    };

    if(a == "fill") return out;

    if(typeof a == "string"){
        let keyword;
        const [k1, k2] = keyword = a.split("-");

        if(k2){
            if(k1 == "fill")
                delete out.attrs[OPPOSITE[k2]]

            else for(const dir of keyword)
                delete out.attrs[OPPOSITE[dir]]

            return out
        }
    }
            
    return position(...this.arguments)
}

function position(){
    let data = {};
    if(typeof a != "number")
    for(const item of this.arguments)
        if(item.named)
            data[item.named] = item.inner[0]
        else {
            data = null;
            break;
        }

    const out = data 
        ? { attrs: data } 
        : pos(...this.arguments);
        
    return out
}

function pos(){
    const [top, right, bottom, left] = rect(...this.arguments)
    return {
        attrs: { top, right, bottom, left }
    }
}