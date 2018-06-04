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

export { hsla as hsl }

export function hsla(h, s, l, a = 1){
    for(const x of [h,s,l])
        if(typeof x != "number") 
            throw new Error("malformed arguments in hsl statement")

    const hsl = [ h, s+"%", l+"%" ].join(",");
    return {
        value: a == 1 ? `hsl(${hsl})` : `hsla(${hsl},${a})`
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
