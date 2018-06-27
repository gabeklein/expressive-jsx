
export * from "./flex"
export * from "./frame"
export * from "./text"
export * from "./position"

export function background(a){
    return /^(#|rgb)/.test(a)
        ? { style: {
            backgroundColor: a
        }}
        : { style: {
            background: a
        }}
}

import * as Helpers from "./helpers"
export { Helpers }