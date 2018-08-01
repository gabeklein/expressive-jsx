export function image(a){
    const CDN = process.env.CDN || "";
    if(CDN)
        a = CDN + "/" + a;
    
    return {
        style: {
            backgroundImage: `url("${a}")`
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
            backgroundImage: this.arguments
        }} 
}
