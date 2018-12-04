import {
    Path
} from './types';

import {
    Expression,
    Statement,
    ObjectProperty,
    SpreadProperty,
    ExpressionStatement
} from "@babel/types"

import {
    toArray,
} from "./internal";

import * as t from "@babel/types";

export abstract class Attribute {
    name: string;
    value?: string | number;
    node?: Expression;
    overriden?: true;
    priority: number;

    constructor(
        name: string, 
        value: string | number | Expression, 
        priority = 1 ){

        this.name = name;
        if(typeof value == "string" || typeof value == "number")
            this.value = value;
        else
            this.node = value;
        this.priority = priority;
    }

    get syntax(){
        const { node, value } = this;

        return node || (
            typeof value == "string"
                ? t.stringLiteral(value)
                : t.numericLiteral(value!)
        );
    }

    toProperty(): ObjectProperty | SpreadProperty {
        return t.objectProperty(
            t.identifier(this.name), 
            this.syntax
        )
    }

    toAssignment(target: Expression): ExpressionStatement {
        return t.expressionStatement(
            t.assignmentExpression("=",
                t.memberExpression(target, t.identifier(name)), 
                this.syntax
            )
        );
    }
};

export type Props = SpreadProp | Prop;
export type Styles = SpreadProp | ExplicitStyle;

export class SpreadProp extends Attribute {
    constructor(type: "props" | "style", node: Expression){
        super(type, node);
    }

    toProperty(): SpreadProperty {
        return t.spreadElement(this.syntax)
    }

    toAssignment(target: Expression): ExpressionStatement {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    t.identifier("Object"),
                    t.identifier("assign")
                ), 
                [target, this.syntax]
            )
        )
    }
}

export class Prop extends Attribute {
    
}

export class ExplicitStyle extends Attribute {
    verbatim?: Expression;

    constructor(name: string, value: any, priority = 1) {
        super(name.replace(/^\$/, "--"), value);
    }

    toString(): string {
        const name = this.name.replace(/([A-Z]+)/g, "-$1").toLowerCase();
        let { value } = this;

        if(typeof value == "string"){
            if(value === "") value = `""`;
            if(/\s/.test(value)) 
                value == `"${value.replace(/\s+/g, " ")}"`
        }

        return `${name}: ${value}`
    }

    toProperty(){
        const name = this.name;
        const compute = /^[$A-Z_][0-9A-Z_$]*$/.test(name) == false;
        const id = compute
            ? t.stringLiteral(name) 
            : t.identifier(name);
        
        return t.objectProperty(id, this.syntax, compute);
    }

    toAssignment(to: Expression){
        const name = this.name;
        const compute = name.indexOf("-") >= 0;
        const id = compute
            ? t.stringLiteral(name) 
            : t.identifier(name);

        return t.expressionStatement(
            t.assignmentExpression("=",
                t.memberExpression(to, id, compute), this.syntax
            )
        )
    }
}

export class InnerStatement {

    inlineType = "stats"
    node: Statement;

    output(){
        return this.node;
    }

    constructor(path: Path<Statement>){
        this.node = path.node;
    }
}

export class NonComponent {
    inlineType = "child";
    precedence: number;
    path?: Path;
    node: Expression;

    constructor(src: Path<Expression> | Expression){
        if((src as Path).node){
            this.path = src as Path;
            this.node = this.path.node as Expression;
        }
        else
            this.node = src as Expression

        this.precedence = 
            src.type == "StringLiteral" ? 4 : 3;
    }

    outputInline(){
        return this.node;
    }

    transform(){
        return { product: this.node }
    }

    collateChildren(){
        return {
            output: toArray(this.node)
        }
    }
}