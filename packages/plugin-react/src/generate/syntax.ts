import t, { Expression, LVal, Statement, MemberExpression } from '@babel/types';
import { ExplicitStyle, Prop } from '@expressive/babel-plugin-core';
import { BunchOf } from 'types';

export function PropertyES(
    name: string, 
    value: Expression){

    const key = t.stringLiteral(name);
    return t.objectProperty(key, value)
}

export const AttributeES = (src: ExplicitStyle | Prop) => 
    PropertyES(src.name as string, expressionValue(src));

export function expressionValue(item: Prop | ExplicitStyle){
    let { value } = item;

    return (
        typeof value === "string" ?
            t.stringLiteral(value) :
        typeof value === "number" ?
            t.numericLiteral(value) :
        typeof value === "boolean" ?
            t.booleanLiteral(value) :
        value === undefined && item.path ?
            item.path.node :
        typeof value === "object" ?
            value || t.nullLiteral() :
            t.identifier("undefined")
    )
}

export function ensureArray(
    children: Expression, 
    getFirst?: boolean){

    const array = callExpression(
        memberExpression(
            t.arrayExpression([]), "concat"
        ),
        children
    )
    return getFirst ? memberExpression(array, 0) : array;
}

export function IIFE(stats: Statement[]){
    return callExpression(
        t.arrowFunctionExpression([], 
            t.blockStatement(stats as any)
        )
    )
}

export function objectExpression(obj: BunchOf<Expression | false | undefined> = {}){
    const properties = [];
    for(const x in obj){
        if(obj[x])
        properties.push(
            t.objectProperty(
                t.identifier(x),
                obj[x] as Expression
            )
        )
    }
    return t.objectExpression(properties);
}

export function memberExpression(
    object: string | Expression, 
    ...path: (string | number)[] ){

    if(object == "this") 
        object = t.thisExpression()

    if(typeof object == "string")
        path = [...object.split("."), ...path]

    for(let member of path){
        let select;
        
        if(typeof member == "string"){
            select = /^[A-Za-z0-9$_]+$/.test(member)
                ? t.identifier(member)
                : t.stringLiteral(member);
        }
        else if(typeof member == "number")
            select = t.numericLiteral(member);
        else
            throw new Error("Bad member id, only strings and numbers are allowed")
        
        object = typeof object == "object"
            ? t.memberExpression(object, select, select!.type !== "Identifier")
            : select;
    }
    
    return object as MemberExpression;
}

export function callExpression(
    callee: Expression,
    ...args: Expression[]
){
    return t.callExpression(callee, args)
}

export function declare(
    type: "const" | "let" | "var", 
    id: LVal, 
    init?: Expression ){

    return (
        t.variableDeclaration(type, [
            t.variableDeclarator(id, init)
        ])
    )
}