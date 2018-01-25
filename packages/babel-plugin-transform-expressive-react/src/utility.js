import * as t from "babel-types"

export function contains(string){
    return (within) => within[0].split(", ").indexOf(string) >= 0
}

export function elementShouldSkipTransform(path){
    return path.node && (
           path.node.extra
        && path.node.extra.parenthesized === true
        || contains(path.type) `StringLiteral, TemplateLiteral`
    )
}

export const CREATE_ELEMENT = 
    t.memberExpression(
        t.identifier("React"),
        t.identifier("createElement")
    );