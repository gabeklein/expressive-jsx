

export function font(){

    const attrs = {};

    for(const arg of this.arguments){
        if(arg % 100 === 0)
            attrs.fontWeight = arg;
        else if(isNaN(arg) === false)
            attrs.fontSize = arg;
        else if(typeof arg === "string")
            attrs.fontFamily = arg
    }

    return { attrs }
}

export { fontFamily as family }

export function fontFamily(){

    const fam = this.arguments
        .map((font) => {
            if(~font.indexOf(" "))
                return `"${font}"`
            else return font
        })
        .join(", ");

    return {
        style: {
            fontFamily: fam
        }
    }
}