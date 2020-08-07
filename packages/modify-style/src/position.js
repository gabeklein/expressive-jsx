import { rect } from "./util"

const INVERSE = {
    top: "bottom",
    left: "right",
    right: "left",
    bottom: "top"
}

export function zIndex(a){
    return {
        style: { zIndex: a }
    }
}

export function absolute(...args){
    return {
        position: "absolute",
        ...computePosition(...args)
    }
}

export function fixed(...args){
    return {
        position: "fixed",
        ...computePosition(...args)
    }
}

export function relative(){
    return {
        style: {
            position: "relative"
        }
    };
}

function computePosition(a, b = 0, c = b){
    let keyword;

    let out = {
        attrs: {
            top: b,
            left: c,
            right: c,
            bottom: b
        }
    };

    if(a == "fill")
        return out;

    if(typeof a == "string"){
        let keyword;
        const [k1, k2] = keyword = a.split("-");

        if(k2){
            if(k1 == "fill")
                delete out.attrs[INVERSE[k2]]

            else for(const dir of keyword)
                delete out.attrs[INVERSE[dir]]

            return out
        }
    }

    return position(...arguments)
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

function _cover(){
    const [ top, right, bottom, left ] = rect(...arguments)
    return {
        attrs: { top, right, bottom, left }
    }
}