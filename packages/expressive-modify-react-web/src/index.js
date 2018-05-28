const EXPORT = exports;

export * from "./position"
export * from "./units"
export * from "./frame"
export * from "./flex"
export * from "./background"

export function font(a, b = null){
    return {
        attrs: {
            fontSize: a,
            fontWeight: b
        }
    }
}