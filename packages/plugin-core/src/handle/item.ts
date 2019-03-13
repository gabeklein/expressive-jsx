import t, { Expression, ExpressionStatement, ObjectProperty, SpreadProperty, Statement } from '@babel/types';
import { Path, Literal } from 'types';
import { toArray } from 'internal';

export abstract class Attribute {
    name: string;
    value?: Literal;
    node?: Expression;
    overriden?: true;

    constructor(name: string){
        this.name = name;
    }

    get syntax(){
        return this.node || t.identifier("undefined");
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

export class SpreadItem extends Attribute {

    node: Expression;
    orderInsensitive?: true;

    constructor(
        name: "props" | "style", 
        node: Expression){
    
        super(name);
        this.node = node;
    }

    toProperty(): SpreadProperty {
        return t.spreadElement(this.node)
    }

    toAssignment(target: Expression): ExpressionStatement {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    t.identifier("Object"),
                    t.identifier("assign")
                ), 
                [target, this.node]
            )
        )
    }
}

export class Prop extends Attribute {

    constructor(
        name: string, 
        value: Expression
    ){
        super(name);
        this.node = value;

        if(value.type == "NumericLiteral" 
        || value.type == "StringLiteral" 
        || value.type == "BooleanLiteral")
            this.value = value.value;
        else
        if(value.type == "NullLiteral")
            this.value = null;
    }
}

export class SyntheticProp extends Attribute {

    constructor(
        name: string, 
        value: any
    ){
        super(name);
        this.value = value;
    }

    get node(){
        const { value } = this;

        return (
            value === null ? t.nullLiteral() :
            typeof value == "string" ? t.stringLiteral(value) :
            typeof value == "number" ? t.numericLiteral(value) :
            typeof value == "boolean" ? t.booleanLiteral(value) :
            undefined
        )
    }
}

export class ExplicitStyle extends Attribute {
    verbatim?: Expression;
    priority: number;

    constructor(name: string, value: any) {
        super(
            name.replace(/^\$/, "--"));
        this.priority = 1;
        this.value = value;
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

export class InnerStatement<T extends Statement = Statement> {

    node: T;

    constructor(path: Path<T>){
        this.node = path.node;
    }

    output(){
        return this.node;
    }
}

export class NonComponent <T extends Expression = Expression> {
    inlineType = "child";
    precedence: number;
    path?: Path;
    node: Expression;

    private isPath(syntax: T | Path<T>): syntax is Path<T> {
        return (syntax as any).node !== undefined;
    }

    constructor(
        src: Path<T> | T){
            
        if(this.isPath(src)){
            this.path = src;
            this.node = src.node;
        }
        else
            this.node = src

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