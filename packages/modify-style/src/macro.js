export function clickable(){
    return {
        attrs: {
            cursor: "pointer",
            WebkitUserSelect: "none"
        }
    }
}

export function icon(mask, color){
    if(!mask) return;

    if(mask.indexOf(".svg") < 0)
        mask = mask.concat(".svg")

    const attrs = {
        WebkitMaskImage: `url(\"${mask}\")`
    }
    
    if(color)
        attrs.bg = color;

    return { attrs }
}