const EXPORT = exports;

export * from "./position"
export * from "./units"
export * from "./frame"

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


export function font(a, b = null){
    return {
        attrs: {
            fontSize: a,
            fontWeight: b
        }
    }
}

export function backgroundImage(a){
    if(typeof a == "object" && !a.named)
        return { style: {
            backgroundImage: a
        }}
    else 
        return { attrs: {
            backgroundImage: Array.from(arguments)
        }} 
}

