import {
    Path,
    ExpressiveElementChild,
    ElementSyntax,
    AssignmentExpression,
    ForStatement,
    ForOfStatement,
    ForInStatement,
    Identifier,
    StringLiteral,
    VariableDeclaration,
    LVal,
    ObjectProperty,
    Expression,
    Statement,
    DoExpression
} from "./types";

import {
    ComponentGroup,
    Shared,
    transform,
    ensureUIDIdentifier
} from "./internal";

import * as t from "@babel/types";

type AnyForStatement = ForStatement | ForInStatement | ForOfStatement;

export class ComponentRepeating 
    extends ComponentGroup 
    implements ExpressiveElementChild {

    static applyTo(
        parent: ComponentGroup, 
        src: Path<AnyForStatement>, 
        kind?: string ){

        parent.add(
            new this(src, parent, kind) as any
        )
    }

    inlineType = "child";
    insert = "fragment";
    precedence = -1;
    shouldOutputDynamic = true;
    kind?: string;
    body: any;
    path: any;
    node: any;
    left?: Path<VariableDeclaration|LVal>;
    keyConstruct?: Expression;

    constructor(
        path: Path<AnyForStatement>, 
        parent: ComponentGroup, 
        kind?: string ){

        // const node = path.node;

        super();
        this.scope = path.scope;
        this.kind = kind;
        this.node = path.node;
        this.path = path;
        if(path.isForOfStatement() 
        || path.isForInStatement())
            this.left = path.get("left");
        this.insertDoIntermediate(path);
    }

    mayReceiveAttributes(){
        this.shouldOutputDynamic = true;
        return false;
    }

    didEnterOwnScope(path: Path<DoExpression>){
        super.didEnterOwnScope(path)
        this.body = path;
    }

    transform(): ElementSyntax {
        if(this.kind == "of")
            return this.toMap()
        else
            return this.toFactory();
    }

    toMap(){
        let { left, right } = this.node;

        if(left.type == "VariableDeclaration")
            throw this.left!.buildCodeFrameError("'const' not supported when loop outputs a map function")
            // left = left.declarations[0].id;
            
        let { body, output } = this.collateChildren(
            function onAttributes(_: any){}
        )

        let key;

        if(right.type == "BinaryExpression" && right.operator == "in")
            ({ left: key, right } = right);
        else key = ensureUIDIdentifier.call(this.path.scope, "i");

        const fragment_props = [ t.objectProperty( t.identifier("key"), key ) ] as ObjectProperty[];

        const pushable = output.length > 0
            ? transform.createFragment(output, fragment_props)
            : t.booleanLiteral(false)

        const functionBlock = t.blockStatement([
            ...body,
            t.returnStatement(pushable)
        ]);
    
        return {
            product: t.callExpression(
                t.memberExpression(
                    right, t.identifier("map")
                ), [ 
                    t.arrowFunctionExpression([left, key], functionBlock)
                ]
            )
        }
    }

    toFactory(): ElementSyntax {
        Shared.state.expressive_for_used = true;

        const accumulator = this.scope!.generateUidIdentifier("l");
        const { node } = this;

        let { body, output } = this.collateChildren(
            function onAttributes(_: any){
                //error
            }
        )

        let key = this.keyConstruct;
        const fragment_props = key
            ? [ t.objectProperty( t.identifier("key"), key ) ]
            : []

        const pushable = output.length > 0
            ? transform.createFragment(output, fragment_props)
            : t.booleanLiteral(false)

        const loopBlock = t.blockStatement([
            ...body,
            t.expressionStatement(
                t.callExpression(
                    t.memberExpression(accumulator, t.identifier("push")), 
                    [ pushable as Expression ]
                )
            )
        ]);

        const forVariant =
            this.kind == "of" ? t.forOfStatement :
            this.kind == "in" ? t.forInStatement :
            false;

        const loop = forVariant
            ? forVariant(
                node.left,
                node.right,
                loopBlock
            )
            : t.forStatement(
                node.init,
                node.test,
                node.update,
                loopBlock
            );

        if(!key){
            key = t.identifier("key");
            (loop as any).expressive_setKey = (name: Expression) => {
                fragment_props.push(
                    t.objectProperty(t.identifier("key"), name)
                )
            }
        }

        const factory = [
            transform.declare("const", accumulator, t.arrayExpression([])),
            loop
        ]

        const product = 
            this.insert == "fragment" ?
                t.callExpression( Shared.stack.helpers.createIterated, [accumulator] ) :
            this.insert == "array" ?
                accumulator :
                t.booleanLiteral(false);

        return { 
            factory, product
        }
    }

    insertDoIntermediate(path: Path<AnyForStatement>){
        let action = (path.get("body") as Path<Statement>).node;

        if(action.type != "BlockStatement")
            action = t.blockStatement([action])

        super.insertDoIntermediate(path, action)
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        const { left, right } = path.node;

        if(left.type == "Identifier"){
            const { name } = left as Identifier;

            if(name == "key")
                this.keyConstruct = path.node.right;

            else if(name == "insert"){
                if(right.type == "StringLiteral"){
                    const { value } = right as StringLiteral;

                    if(~["fragment", "array"].indexOf(value))
                        this.insert = value;

                    else throw path.buildCodeFrameError(`
                        Invalid value '${value}' for insert property of for-loop. Acceptable value is "array" or "fragment" (default).
                    `)
                }
                else throw path.buildCodeFrameError(`
                    Property "insert" in for-loop must be a string with value [ fragment | array ]
                `)
            }
            else super.AssignmentExpression(path);
        }
        else super.AssignmentExpression(path);
    }
}