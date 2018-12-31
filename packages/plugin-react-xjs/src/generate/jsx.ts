import {
    CallExpression,
    Expression,
    Identifier,
    JSXIdentifier,
    ObjectExpression,
    ObjectMember,
    SpreadElement,
    StringLiteral,
    ObjectProperty,
} from '@babel/types';

import t, { Shared, Opts } from '../internal';

export const jsx = {
    createFragment(
        elements: any[], 
        props = [] as ObjectProperty[] ){

        let type = t.jsxIdentifier(Shared.stack.helpers.Fragment.name);

        if(elements.length == 1)
            return this.applyProp(
                elements[0],
                props
            )

        return t.jsxElement(
            t.jsxOpeningElement(type, props.map(convertObjectProps)),
            t.jsxClosingElement(type), 
            elements.map( (child: any) => {
                if(child.type == "StringLiteral" && child.value !== "\n")
                    return this.jsxText(child.value);
                if(child.type == "JSXElement")
                    return child;
                return t.jsxExpressionContainer(child);
            }),
            elements.length >= 1
        )

    },

    jsxText(value: string){
        value = value.replace(/'/g, "\"")
        return t.jsxText(value);
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

    createElement(
        type: string | StringLiteral | Identifier, 
        props: ObjectExpression | Identifier | CallExpression | Expression, 
        ...children: Expression[] ){
    
        if(typeof type !== "string")
            type = (type as StringLiteral).value || (type as Identifier).name;
    
        const tag = t.jsxIdentifier(type);
        const isSelfClosing = children.length == 0;
        let attributes = [] as (t.JSXAttribute | t.JSXSpreadAttribute)[];
    
        if(props.type == "Identifier")
            attributes = [ t.jsxSpreadAttribute(props) ];
    
        else if(
            props.type == "CallExpression" && 
            (props.callee as Identifier).name == "flatten" ){
    
            const flatten = [];
            
            for(const argument of props.arguments){
                if(argument.type == "ObjectExpression"){
                    const attributes = argument.properties.map((property: any) => {
                        if(property.key.type != "Identifier")
                            throw new Error("prop error, key isnt an identifier")
    
                        let id = t.jsxIdentifier(property.key.name);
                        let assignment = property.value;
    
                        if(assignment.type == "JSXElement" 
                        || assignment.type == "JSXFragment"
                        || assignment.type == "StringLiteral" && assignment.value !== "\n"){
                            assignment = t.jsxExpressionContainer(assignment)
                        }
    
                        return t.jsxAttribute(id, assignment);
                    });
    
                    flatten.push(...attributes)
                }
                else
                    flatten.push(t.jsxSpreadAttribute(argument as Expression));
            }
            
            attributes = flatten;
        }
    
        else if(props.type == "ObjectExpression")
            attributes = props.properties.map(convertObjectProps)
    
        return t.jsxElement(
            t.jsxOpeningElement(tag, attributes, isSelfClosing),
            t.jsxClosingElement(tag), 
            children.map( (child: any) => {
                switch(child.type){
                    case "JSXElement":
                        return child;
                    case "SpreadElement": 
                        return t.jsxExpressionContainer(
                            t.callExpression( Shared.stack.helpers.createIterated, [child.argument] )
                        )
                    case "StringLiteral":
                        if(child.value !== "\n")
                            return this.jsxText(child.value);
                    default:
                        return t.jsxExpressionContainer(child);
                }
            }),
            isSelfClosing
        )
    }
}

export function convertObjectProps(attr: ObjectMember | SpreadElement){
    if(attr.type === "SpreadElement")
        return t.jsxSpreadAttribute(attr.argument);
    else if(attr.type == "ObjectMethod")
        throw new Error("object method to JSX attr not yet supported");

    let attribute: JSXIdentifier;
    let assignment;
        
    if(attr.type == "ObjectProperty"){
        const { key, value } = attr;

        if(key.type == "Identifier")
            attribute = t.jsxIdentifier(key.name);

        else if(key.type == "StringLiteral"){
            if(/^[a-zA-Z_][\w-]+\w$/.test(key.value))
                attribute = t.jsxIdentifier(key.value);
            else throw new Error(`Member named ${key.value} not supported as JSX attribute.`)
        }

        if( value.type == "StringLiteral" && value.value === "true" ||
            value.type == "BooleanLiteral" && value.value === true )
            assignment = null

        else if(value.type !== "JSXElement" && value.type !== "StringLiteral")
            assignment = t.jsxExpressionContainer(value as Expression);
        
        else 
            assignment = value;
    }

    return t.jsxAttribute(attribute!, assignment)
}