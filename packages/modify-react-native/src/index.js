
export * from "./flex"
export * from "./frame"
export * from "./text"
export * from "./position"

export const background = (a) =>
    // /^(#|rgb)/.test(a)
    true
        ? { style: {
            backgroundColor: a
        }}
        : { style: {
            background: a
        }}

import * as Helpers from "./helpers"
export { Helpers }