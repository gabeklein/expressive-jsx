import {
    Path,
    Scope,
    BunchOf
} from "./types";

import {
    LabeledStatement,
    StringLiteral,
    Identifier,
    Expression,
    ObjectExpression,
    CallExpression,
    ObjectMember,
    SpreadElement,
    JSXIdentifier,
    Statement,
    Program,
    ObjectProperty,
    LVal
} from "@babel/types";

import * as t from "@babel/types";

type value = string | number;
type ParseError = (path: Path, ...args: value[]) => Error;

export function ErrorsPossible <O extends BunchOf<string>> (register: O) {
    const Errors = {} as BunchOf<ParseError>

    for(const error in register){
        let message = [] as value[];

        for(const segment of register[error].split(/\{(?=\d+\})/)){
            const ammend = /(\d+)\}(.+)/.exec(segment);
            if(ammend)
                message.push(parseInt(ammend[1]), ammend[2]);
            else
                message.push(segment);
        }

        Errors[error] = (path: Path, ...args: value[]) => {
            let quote = "";
            for(const slice of message)
                quote += (
                    typeof slice == "string" 
                        ? slice : args[slice - 1]
                )

            return path.buildCodeFrameError(quote)
        }
    }

    return Errors as {
        readonly [P in keyof O]: ParseError
    };
}

export function toArray<T>(value: T | T[]): T[] {
    return value 
        ? Array.isArray(value) 
            ? value 
            : [value] 
        : [];
}

export function inParenthesis(path: Path<Expression>): boolean {
    const node = path.node as any;
    return node.extra && (node.extra.parenthesized === true) || false;
}

interface SharedSingleton {
    stack: any
    opts?: any
    state: {
        expressive_for_used?: true;
    }
    styledApplicationComponentName?: string
}

interface Options {
    compact_vars?: true;
    reactEnv: "native" | "web";
    output: "ES6" | "JSX";
    styleMode: "compile";
    formatStyles: any;
}

export const env = process.env || {
    NODE_ENV: "production"
};

export const Shared = {} as SharedSingleton;

export const Opts = {
    reactEnv: "web",
    styleMode: "compile",
    output: "ES6",
    formatStyles: ""
} as Options;

export function hoistLabeled(node: Program){
    const labeled = [] as LabeledStatement[];
    const other = [] as Statement[];

    let shouldHoist = false;
    let nonLabelFound = false;

    for(const item of node.body){
        if(item.type == "LabeledStatement"){
            shouldHoist = nonLabelFound;
            labeled.push(item);
        }
        else {
            nonLabelFound = true;
            other.push(item as any);
        }
    }

    if(shouldHoist)
        node.body = [...labeled, ...other] as any[];
}

export function ensureUIDIdentifier(
    this: Scope,
    name: string = "temp", 
    useExisting: boolean, 
    didUse: BunchOf<any> ){

    name = name.replace(/^_+/, "").replace(/[0-9]+$/g, "");
    let uid;
    let i = 0;

    if(useExisting){
        if(this.hasBinding(uid = name)){
            didUse[uid] = null;
            return t.identifier(uid);
        }
    } else 
        do {
            uid = name + (i > 1 ? i : "");
            i++;
        } 
        while (
            this.hasBinding(uid) || 
            this.hasGlobal(uid) || 
            this.hasReference(uid)
        );

    const program = this.getProgramParent() as any;
    program.references[uid] = true;
    program.uids[uid] = true;
    return t.identifier(uid);
}

function convertObjectProps(attr: ObjectMember | SpreadElement){
    if(attr.type === "SpreadElement")
        return t.jsxSpreadAttribute(attr.argument);
    else if(attr.type == "ObjectMethod")
        throw new Error("object method to JSX attr not yet supported");

    let attribute: JSXIdentifier;
    let assignment;
        
    if(attr.type == "ObjectProperty"){
        let { key, value } = attr;

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

export const transform = {

    IIFE(stats: Statement[]){
        return t.callExpression(
            t.arrowFunctionExpression([], 
                t.blockStatement(stats as any)
            ), []
        )
    },

    createFragment(
        elements: any[], 
        props = [] as ObjectProperty[] ){

        let type = Shared.stack.helpers.Fragment;

        if(elements.length == 1)
            return this.applyProp(
                elements[0],
                props
            )
        
        if(Opts.output == "JSX"){
            type = t.jsxIdentifier(type.name);
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
        }

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

    createElement(
        type: string | StringLiteral | Identifier, 
        props: Expression = t.objectExpression([]), 
        ...children: Expression[] ){

        if(Opts.output == "JSX")
            return this.createJSXElement(type, props, ...children);

        if(typeof type == "string") 
            type = t.stringLiteral(type);

        return t.callExpression(Shared.stack.helpers.createElement, [type, props, ...children])
    },

    createJSXElement(
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
    },

    jsxText(value: string){
        value = value.replace(/'/g, "\"")
        return t.jsxText(value);
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

    ensureArray(
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