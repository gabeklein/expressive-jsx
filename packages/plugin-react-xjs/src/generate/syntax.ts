import { Expression, Identifier, LVal, ObjectProperty, Statement, StringLiteral } from '@babel/types';
import t from '../internal';
import { BunchOf } from '../internal/types';
import { Opts, jsx, Shared, convertObjectProps } from '../internal';

export const transform = {

    IIFE(stats: Statement[]){
        return t.callExpression(
            t.arrowFunctionExpression([], 
                t.blockStatement(stats as any)
            ), []
        )
    },
    
    createElement(
        type: string | StringLiteral | Identifier, 
        props: Expression = t.objectExpression([]), 
        ...children: Expression[] ){

        if(Opts.output == "JSX")
            return jsx.createElement(type, props, ...children);

        if(typeof type == "string") 
            type = t.stringLiteral(type);

        return t.callExpression(Shared.stack.helpers.createElement, [type, props, ...children])
    },

    createFragment(
        elements: any[], 
        props = [] as ObjectProperty[] ){

        if(Opts.output == "JSX")
            return jsx.createFragment(elements, props);

        let type = Shared.stack.helpers.Fragment;

        if(elements.length == 1)
            return this.applyProp(
                elements[0],
                props
            )

        return this.createElement(
            type, t.objectExpression([]), ...elements
        )
    },

    applyProp(element: any, props: any){
        if(Opts.output == "JSX"){
            props = props.map(convertObjectProps);
            element.openingElement.attributes.push(...props)
        }
        else {
            element.arguments[1].properties.push(...props)
        }
        return element;
    },
    
    element(){
        return {
            inlineType: "child",
            transform: (type: string) => ({
                product: this.createElement(type)
            })
        }
    },

    object(obj: BunchOf<any>){
        const properties = [];
        for(const x in obj)
            properties.push(
                t.objectProperty(
                    t.identifier(x),
                    obj[x]
                )
            )
        return t.objectExpression(properties);
    },

    member(
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
    },

    declare(
        type: "const" | "let" | "var", 
        id: LVal, 
        init?: Expression ){

        return (
            t.variableDeclaration(type, [
                t.variableDeclarator(id, init)
            ])
        )
    },

    array(
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
    }, 

    require(module: string){
        return t.callExpression(
            t.identifier("require"), 
            [ t.stringLiteral(module) ]
        )
    }
}