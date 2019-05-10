const { URL_IMAGES } = process.env;
const { rgba, hsla } = require("./helpers.js")

export function image(a){
    const CDN = process.env.CDN || "";
    if(CDN)
        a = CDN + a;
    
    return {
        style: {
            backgroundImage: `url("${a}")`
        }
    }
}

export function bg(a){
    let output;

    if(Array.isArray(a)){
        const [ head, ...tail ] = a;
        switch(head){
            case "url":
                output = {
                    backgroundImage: `url(${URL_IMAGES + tail[1]})`
                };
                break;

            case "rgb":
            case "rgba": {
                const { value } = rgba(...tail);
                output = { backgroundColor: value };
                break;
            }

            case "hsl":
            case "hsla": {
                const { value } = hsla(...tail);
                output = { backgroundColor: value };
                break;
            }
        }
    }
    else {
        output = {
            background: a
        }
    }

    return {
        style: output
    }
}

export function backgroundImage(a){
    if(typeof a == "object" && !a.named)
        return { style: {
            backgroundImage: a
        }}
    else 
        return { attrs: {
            backgroundImage: this.arguments
        }} 
}
