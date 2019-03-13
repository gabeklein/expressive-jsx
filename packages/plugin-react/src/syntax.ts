import t, { Expression, LVal, Statement, JSXElement, JSXFragment } from '@babel/types';
import { Content, Props } from 'jsx';

export interface BunchOf<T> {
    [key: string]: T
}

export function createElement(
    tag: string,
    props = [] as Props[],
    children = [] as Content[]
): JSXElement {
    const type = t.jsxIdentifier(tag);
    return (
        t.jsxElement(
            t.jsxOpeningElement(type, props),
            t.jsxClosingElement(type),
            children,
            children.length > 0
        )
    )
}

export function createFragment(
    children = [] as Content[]
): JSXFragment {
    return (
        t.jsxFragment(
            t.jsxOpeningFragment(),
            t.jsxClosingFragment(),
            children
        )
    )
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

// export function createElement(
//     type: string | StringLiteral | Identifier, 
//     props: Expression = t.objectExpression([]), 
//     ...children: Expression[] ){

//     if(Opts.output == "JSX")
//         return jsx.createElement(type, props, ...children);

//     if(typeof type == "string") 
//         type = t.stringLiteral(type);

//     const CREATE_ELEMENT = Shared.stack.helpers.createElement;

//     return t.callExpression(CREATE_ELEMENT, [type, props, ...children])
// }

// export function createFragment(
//     elements: any[], 
//     props = [] as ObjectProperty[] ){

//     if(Opts.output == "JSX")
//         return jsx.createFragment(elements, props);

//     let type = Shared.stack.helpers.Fragment;

//     if(elements.length == 1)
//         return this.applyProp(
//             elements[0],
//             props
//         )

//     return this.createElement(
//         type, t.objectExpression([]), ...elements
//     )
// }

// export function applyProp(element: any, props: any){
//     if(Opts.output == "JSX"){
//         props = props.map(convertObjectProps);
//         element.openingElement.attributes.push(...props)
//     }
//     else {
//         element.arguments[1].properties.push(...props)
//     }
//     return element;
// }

// export function element(){
//     return {
//         inlineType: "child",
//         transform: (type: string) => ({
//             product: this.createElement(type)
//         })
//     }
// }