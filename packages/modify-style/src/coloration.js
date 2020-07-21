import { rgba, hsla } from "./colors";

export function shadow(color, radius = 10, x = 2, y = x){
    let value;
    if(color == "intial" || color == "none")
        value = color;
    else {
        value = `${x}px ${y}px ${radius}px ${color}`;
    }
    return {
        style: {
            boxShadow: value
        }
    }
}

export function bg(a){
    const { URL_IMAGES } = process.env;
    let output;

    if(Array.isArray(a)){
        const [ head, ...tail ] = a;
        const dir = URL_IMAGES || "";
        switch(head){
            case "url":
                output = {
                    backgroundImage: `url(${dir + tail[1]})`
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