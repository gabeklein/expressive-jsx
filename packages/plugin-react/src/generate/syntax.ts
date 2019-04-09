import t, { Expression, LVal, Statement } from '@babel/types';
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

    const array = t.callExpression(
        t.memberExpression(
            t.arrayExpression([]),
            t.identifier("concat")
        ),
        [children]
    )
    return getFirst ? t.memberExpression(array, t.numericLiteral(0), true) : array;
}

export function IIFE(stats: Statement[]){
    return t.callExpression(
        t.arrowFunctionExpression([], 
            t.blockStatement(stats as any)
        ), []
    )
}

export function object(obj: BunchOf<any>){
    const properties = [];
    for(const x in obj)
        properties.push(
            t.objectProperty(
                t.identifier(x),
                obj[x]
            )
        )
    return t.objectExpression(properties);
}

export function member(
    object: Expression | "this", 
    ...path: (string | number)[] ){

    if(object == "this") 
        object = t.thisExpression()

    for(let member of path){
        let select;
        
        if(typeof member == "string"){
            select = /^[A-Za-z0-9$_]+$/.test(member)
                ? t.identifier(member)
                : t.stringLiteral(member);
        }
        else if(typeof member == "number")
            select = t.numericLiteral(member);
        

        object = t.memberExpression(object, select, select!.type !== "Identifier")
    }
    
    return object
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

export function array(
    children: Expression, 
    getFirst: boolean = false ){

    const array = t.callExpression(
        t.memberExpression(
            t.arrayExpression([]),
            t.identifier("concat")
        ),
        [children]
    )
    return getFirst ? t.memberExpression(array, t.numericLiteral(0), true) : array;
}

export function require(module: string){
    return t.callExpression(
        t.identifier("require"), 
        [ t.stringLiteral(module) ]
    )
}