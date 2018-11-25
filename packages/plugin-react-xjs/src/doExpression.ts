import {
    Identifier,
    Expression,
    DoExpression,
    BlockStatement,
    ArrowFunctionExpression,
    Statement,
    ReturnStatement,
    RestElement,
    Path,
    BunchOf
} from "./types";

import {
    ComponentEntry,
    transform,
    ensureArray,
    findAncestorOf
} from "./internal"

import * as t from "@babel/types";

const NAME_FROM = {
    VariableDeclarator: "id",
    AssignmentExpression: "left",
    AssignmentPattern: "left",
    ObjectProperty: "key"
} as BunchOf<string>

export function enter(path: Path<DoExpression>, state:any){

    let node = path.node as any,
        { meta } = node;

    if(node.expressive_visited) return

    if(!meta){

        let immediateParent = path.parentPath;
        let Handler: any;

        if(immediateParent.isArrowFunctionExpression()){
            Handler = ComponentArrowExpression;
            immediateParent = immediateParent.parentPath;
        } 
        else if((path.getAncestry()[3] || 0).type == "ArrowFunctionExpression"){
            Handler = ComponentArrowExpression;
            immediateParent = path.getAncestry()[3];
        }
        else if(!immediateParent.isSequenceExpression()){
            Handler = ComponentInlineExpression;
        }
        else { 
            const isWithin = findAncestorOf(path, "ArrowFunctionExpression", "ClassMethod");
            if(isWithin)
                isWithin.buildCodeFrameError(
                    "Component Syntax `..., do {}` found outside expressive context! Did you forget to arrow-return a do expression?"
                )
        }

        let { type, node: parent } = immediateParent;
        let name;

        switch(type){
            case "ExportDefaultDeclaration":
                name = "default";
                break;

            case "ReturnStatement": 
                name = "returned";
                break;

            case "SequenceExpression":
                name = "callback";
                break;

            default: {
                let ident = (parent as any)[NAME_FROM[type]];
                name = ident && ident.name;
                if(!name){
                    if(parent.type == "FunctionExpression")
                        for(const { node } of path.getAncestry()){
                            if(node.type == "VariableDeclarator"){
                                ({ name } = node.id as Identifier);
                                break;
                            }
                        }
                    else name = "do"
                }
            }
        }

        meta = node.meta = new Handler(path, name)
    }

    meta.didEnterOwnScope(path)

    state.expressive_used = true;
}

export function exit(path: Path<DoExpression>, state:any){
    const node = path.node as any;

    if(node.expressive_visited) return
    else node.expressive_visited = true;

    if(!node.meta) debugger

    node.meta.didExitOwnScope(path)
}


class ComponentArrowExpression extends ComponentEntry {

    constructor(path: Path<DoExpression>, name: string) {
        super();
        this.tags.push({ name })
    }

    insertDoIntermediate(path: Path<DoExpression>){
        (path.node as any).meta = this;
    }

    didExitOwnScope(path: Path<DoExpression>){
        const parentFn = findAncestorOf(path, "ArrowFunctionExpression") as Path<ArrowFunctionExpression>, 
            { node } = parentFn, 
            { params } = node, 
            [ props ] = params;

        let body = this.outputBodyDynamic();

        if(props && props.type == "AssignmentPattern"){
            const right = parentFn.get("params.0.right") as Path;
            throw right.buildCodeFrameError(
                "This argument will always resolve to component props") 
        }
        
        if(params.length > 1){
            let args = params.slice(1);
            let count = args.length;
            let ident;

            let assign: RestElement | Identifier = count > 1 
                ? t.arrayPattern(args as any) : args[0] as any;
                
            if(assign.type == "RestElement")
                assign = assign.argument as Identifier, count++;
    
            if(props.type == "ObjectPattern")
                props.properties.push(
                    t.objectProperty(
                        t.identifier("children"), 
                        count > 1
                            ? ident = path.scope.generateUidIdentifier("children")
                            : assign
                    )
                )
            else ident = t.memberExpression(props as any, t.identifier("children"));

            if(ident)
                body.unshift(
                    transform.declare("const", assign, ensureArray(ident, count == 1))
                )
        }

        if(this.style_static || this.mayReceiveExternalClasses)
            this.generateUCN();

        const internalStatements = (parentFn.node.body as BlockStatement).body;
        if(internalStatements.length > 1)
            body.unshift(...internalStatements.slice(0, -1))

        let functionBody: Expression | Statement;
        
        if(body.length == 1 && body[0].type == "ReturnStatement")
            functionBody = (body[0] as ReturnStatement).argument as Expression;
        else
            functionBody = t.blockStatement(body)

        parentFn.replaceWith(
            t.arrowFunctionExpression(
                props ? [props] : [],
                functionBody,
                node.async
            )
        )
        this.context.pop();
    }
}
 
class ComponentInlineExpression extends ComponentArrowExpression {

    didExitOwnScope(path: Path<DoExpression>){
        const { body, output: product }
            = this.collateChildren();
            
        path.replaceWithMultiple(
            !body.length
                ? this.bundle(product)
                : [transform.IIFE(this.outputBodyDynamic())]
        )

        this.context.pop();
    }
}