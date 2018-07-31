export function font(a, b = null){
    if(typeof a == "string" && !/^[0-9]+/.test(a))
        return {
            attrs: {
                fontFamily: a
            }
        }
    return {
        attrs: {
            fontSize: a,
            fontWeight: b
        }
    }
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