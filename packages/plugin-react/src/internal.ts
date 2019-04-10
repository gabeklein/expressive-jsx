// internal module pattern
// control load order to prevent skullduggery, also cleaner
// https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de

export * from "types"

export * from "handle/attributes";
export * from "handle/element";
export * from "handle/switch";
export * from "handle/iterate";
export * from "generate/syntax";
export * from "generate/element";
export * from "generate/es5";
export * from "generate/jsx";
export * from "regenerate/component";
export * from "regenerate/module";
