import {
    arrayExpression,
    arrowFunctionExpression,
    blockStatement,
    booleanLiteral,
    Expression,
    identifier,
    LVal,
    MemberExpression,
    nullLiteral,
    numericLiteral,
    objectProperty,
    Statement,
    stringLiteral,
    thisExpression,
    variableDeclaration,
    variableDeclarator,
    objectExpression,
    memberExpression,
    callExpression,
} from '@babel/types';
import { ExplicitStyle, Prop } from '@expressive/babel-plugin-core';
import { BunchOf } from 'types';

export function propertyES(
    name: string, 
    value: Expression){

    const key = stringLiteral(name);
    return objectProperty(key, value)
}

export const attributeES = (src: Prop | ExplicitStyle) => 
    propertyES(src.name as string, expressionValue(src) as Expression);

export function expressionValue(item: Prop | ExplicitStyle): Expression {
    let { value } = item;

    return (
        typeof value === "string" ?
            stringLiteral(value) :
        typeof value === "number" ?
            numericLiteral(value) :
        typeof value === "boolean" ?
            booleanLiteral(value) :
        value === undefined && item.node ?
            item.node as unknown as Expression :
        typeof value === "object" ?
            value || nullLiteral() :
            identifier("undefined")
    )
}

export function ensureArray(
    children: Expression, 
    getFirst?: boolean){

    const array = callExpression(
        memberExpression(
            arrayExpression([]), "concat"
        ),
        [ children ]
    )
    return getFirst ? memberExpression(array, 0) : array;
}

export function iife(stats: Statement[]){
    return callExpress(
        arrowFunctionExpression([], 
            blockStatement(stats as any)
        )
    )
}

export function objectExpress(obj: BunchOf<Expression | false | undefined> = {}){
    const properties = [];
    for(const x in obj){
        if(obj[x])
        properties.push(
            objectProperty(
                identifier(x),
                obj[x] as Expression
            )
        )
    }
    return objectExpression(properties);
}

export function memberExpress(
    object: string | Expression, 
    ...path: (string | number)[] ){

    if(object == "this") 
        object = thisExpression()

    if(typeof object == "string")
        path = [...object.split("."), ...path]

    for(let member of path){
        let select;
        
        if(typeof member == "string"){
            select = /^[A-Za-z0-9$_]+$/.test(member)
                ? identifier(member)
                : stringLiteral(member);
        }
        else if(typeof member == "number")
            select = numericLiteral(member);
        else
            throw new Error("Bad member id, only strings and numbers are allowed")
        
        object = typeof object == "object"
            ? memberExpression(object, select, select!.type !== "Identifier")
            : select;
    }
    
    return object as MemberExpression;
}

export function callExpress(
    callee: Expression,
    ...args: Expression[]
){
    return callExpression(callee, args)
}

export function declare(
    type: "const" | "let" | "var", 
    id: LVal, 
    init?: Expression ){

    return (
        variableDeclaration(type, [
            variableDeclarator(id, init)
        ])
    )
}