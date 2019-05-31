import {
    arrayExpression,
    arrowFunctionExpression,
    BlockStatement,
    blockStatement,
    CallExpression,
    callExpression,
    Expression,
    expressionStatement,
    identifier,
    Identifier,
    isArrayPattern,
    isBinaryExpression,
    isIdentifier,
    isObjectPattern,
    memberExpression,
    PatternLike,
    returnStatement,
    isForOfStatement,
    isVariableDeclaration
} from '@babel/types';
import { ComponentFor, ElementInline, Prop, SequenceItem } from '@expressive/babel-plugin-core';
import { ElementReact, ensureUIDIdentifier, GenerateReact } from 'internal';
import { isIdentifierElement } from 'types';
import { declare, IIFE } from 'generate/syntax'; 

export class ElementIterate 
    extends ElementReact<ComponentFor> {

    type: "ForOfStatement" | "ForInStatement" | "ForStatement";
    mayCollapseContent?: boolean;
    key?: Identifier;
    left?: PatternLike;
    right?: Expression;

    constructor(source: ComponentFor){
        super(source);
        this.type = source.path.type as any;
    };
    
    toExpression(Generator: GenerateReact): CallExpression {
        if(this.type === "ForOfStatement")
            return this.toMapExpression(Generator)
        else
            return this.toInvokedForLoop(Generator) as any
    }

    willParse(sequence: SequenceItem[]){
        const { node } = this.source;

        if(!isForOfStatement(node))
            return

        let key: Identifier;
        let { left, right } = node;

        if(isVariableDeclaration(left))
            left = left.declarations[0].id;

        if(isIdentifier(left) 
        || isObjectPattern(left) 
        || isArrayPattern(left))
            void 0;
        else 
            throw new Error("Assignment of variable left of \"of\" must be Identifier or Destruture")

        if(isBinaryExpression(right, {operator: "in"})){
            key = right.left as Identifier
            right = right.right as any;
        }
        else key = ensureUIDIdentifier(this.source.path.scope, "i");

        this.key = key;
        this.left = left;
        this.right = right;

        const inner = this.source.children;
        const [ element ] = inner;

        if(inner.length === 1
        && element instanceof ElementInline
        && isIdentifierElement.test(element.name!) === false
        && element.props.key === undefined){
            element.insert(
                new Prop("key", this.key));
            this.mayCollapseContent = true;
        }

        return undefined
    }

    toMapExpression(Generator: GenerateReact): CallExpression {
        let body: BlockStatement | Expression;
        const { key, mayCollapseContent } = this;
        const { left, right } = this;

        body = Generator.container(this, !mayCollapseContent && key);

        if(this.source.statements.length)
            body = blockStatement([
                ...this.source.statements,
                returnStatement(body)
            ])
    
        return callExpression(
            memberExpression(right!, identifier("map")),
            [ arrowFunctionExpression([left!, key!], body) ]
        )
    }

    toInvokedForLoop(Generator: GenerateReact){
        const accumulator = ensureUIDIdentifier(this.source.path.scope, "acc");
        const sourceLoop = this.source.node;
        const content = Generator.container(this);

        sourceLoop.body = blockStatement([
            ...this.source.statements,
            expressionStatement(
                callExpression(
                    memberExpression(
                        accumulator,
                        identifier("push")
                    ),
                    [ content ]
                )
            )
        ])

        return IIFE([
            declare("const", accumulator, arrayExpression()),
            sourceLoop,
            returnStatement(accumulator)
        ])
    }
}