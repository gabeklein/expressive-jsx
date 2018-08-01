export function font(a, b = null){
    return {
        attrs: {
            fontSize: a,
            fontWeight: b
        }
    }
}

export function fontWeight(a){
    return {
        style: {
            fontWeight: a.toString()
        } 
    }
}