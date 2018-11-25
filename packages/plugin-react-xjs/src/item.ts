import {
    Path,
    ExpressiveElementChild,
    Expression,
    StringLiteral,
    Identifier,
    Statement,
    AssignmentExpression,
    ArrayExpression,
    ObjectProperty,
    SpreadProperty,
    ExpressionStatement
} from './types';

import {
    Shared,
    toArray,
    ElementInline,
    ComponentGroup,
    AttrubutesBody,
    HEX_COLOR
} from "./internal";

import * as t from "@babel/types";

export abstract class Attribute implements ExpressiveElementChild {

    path?: Path<any>;
    isSpread?: true;
    kind?: "style" | "props";
    static?: any;

    abstract inlineType: string;
    abstract name?: string;

    constructor(path?: any){
        this.path = path;
    }

    get id(): Identifier {
        return t.identifier(this.name!);
    }

    get value(): Expression | undefined {
        const value = this.static;
        if(value) switch(typeof value){
            case "string": return t.stringLiteral(value)
            case "number": return t.numericLiteral(value)
        }
    }

    get asProperty(): ObjectProperty | SpreadProperty {
        const { name, value, isSpread } = this;
        if(isSpread){
            return t.spreadElement(value!)
        } else {
            if(!name)
                throw new Error("Internal Error: Prop has no name!")
            return t.objectProperty(t.identifier(name), value!)
        }
    }

    asAssignedTo(target: Expression): ExpressionStatement {
        const { name, value, isSpread } = this;
        let assign;

        if(isSpread){
            assign = t.callExpression(
                t.memberExpression(
                    t.identifier("Object"),
                    t.identifier("assign")
                ), 
                [target, value!]
            )
        } else {
            if(!name) {
                debugger
                throw new Error("Internal Error: Prop has no name!")
            }
            assign = t.assignmentExpression("=",
                t.memberExpression(target, t.identifier(name)), value!
            )
        }

        return t.expressionStatement(assign);
    }
}

export class SyntheticProp extends Attribute {

    inlineType = "props"
    precedence = 1
    name: string;

    constructor(name: string, value: string | StringLiteral) {
        super()
        this.name = name;
        if(typeof value == "string")
            value = t.stringLiteral(value)
        
        Object.defineProperty(this, "value", {
            value, configurable: true
        })
    }
}

export class Prop extends Attribute {

    inlineType = "props";
    precedence = 1;
    type?: "SpreadElement";
    path: Path<AssignmentExpression>;
    name?: string;

    constructor(path: Path<AssignmentExpression>){
        super(path)
        const { computed } = this;
        this.path = path;
        if(computed){
            this.static = computed;
            delete this.precedence;
        }
    }

    static applyTo(parent: AttrubutesBody, path: Path<AssignmentExpression>){
        if( (path.node.left as Identifier).name == "style"){
            this.applyStyle(parent, path);
            return
        }
        if(path.node.operator != "=") 
            path.buildCodeFrameError("Only `=` assignment may be used here.")

        parent.add( 
            new this(path)
        )
    }

    static applyStyle(parent: AttrubutesBody, path: Path<AssignmentExpression>){
        const spread = new this(path);

        spread.kind = "style";
        spread.inlineType = "style";
        spread.isSpread = true;
        spread.type = "SpreadElement"

        parent.add(
            spread
        )
    }

    get computed(){
        let value;
        const { node } = this.path;
        const { extra } = value = node.right as any;

        const name = this.name = (node.left as Identifier).name;

        if(name != "style"){
            if( t.isNumericLiteral(value))
                return /^0x/.test(extra.raw)
                    ? HEX_COLOR(extra.raw)
                    : extra.rawValue
            else if(t.isStringLiteral(value))
                return value.value;
        }
    }

    get value(): Expression {
        return super.value || this.path.node.right;
    }
}

export class ExplicitStyle {

    name: string;
    static: string | number | null;
    inlineType: "style" | "style_static";
    id: StringLiteral | Identifier;
    value: Expression;

    constructor(name: string, value: any) {
        if(name[0] == "$"){
            name = "--" + name.slice(1)
            this.id = t.stringLiteral(name);
        } else {
            this.id = t.identifier(name);
        }
        
        this.name = name;
        this.static = value;
        this.inlineType = Shared.stack.styleMode.compile ? "style_static" : "style";

        switch(typeof value){
            case "number":
                this.value = t.numericLiteral(value)
                break;
            case "string":
                this.value = t.stringLiteral(value)
                break
            case "object": {
                const requires = value.require;
                if(requires){
                    this.value = t.callExpression(
                        t.identifier("require"), 
                        [
                            typeof requires == "string"
                                ? t.stringLiteral(requires)
                                : requires
                        ]
                    )
                    break;
                }
                if(value.type == "verbatim"){
                    this.value = value.path.node;
                    break;
                }
            }
            
            default:
                this.static = null;
                this.inlineType = "style";
                this.value = value.node || value;
        }
    }

    get asString(): string {
        const name = this.name.replace(/([A-Z]+)/g, "-$1").toLowerCase();
        let { static: value } = this;
        if(value === "") value = `""`;
        else if(typeof value == "string"){
            value = value.replace(/\s+/g, " ");
            if(~value.indexOf(" ")) 
                value == `"${value}"`
        }

        return `${name}: ${value}`
    }

    get asProperty(): ObjectProperty {
        let { value, static: stat } = this;
        if(stat && typeof stat == "string")
            value = t.stringLiteral(stat.replace(/\s+/g, " "));
        return t.objectProperty(this.id, value);
    }

    asAssignedTo(target: Expression){
        return t.expressionStatement(
            t.assignmentExpression("=",
                t.memberExpression(target, this.id), this.value
            )
        )
    }
}

export class InnerStatement {

    inlineType = "stats"
    node: Statement;
    kind: "var" | "debug" | "block";

    static applyTo(
        parent: ComponentGroup, 
        path: Path<Statement>, 
        kind: "var" | "debug" | "block" ){

        parent.add( 
            new this(path, kind) as any
        )
    }

    output(){
        return this.node;
    }

    constructor(path: Path<Statement>, kind: any){
        this.kind = kind;
        this.node = path.node;
    }
}

export class NonComponent implements ExpressiveElementChild {
    
    static applyMultipleTo(parent: ComponentGroup, src: Path<ArrayExpression>){
        const elem = src.get("elements");
        if(elem.length == 1 && elem[0].isSpreadElement())
            parent.add(
                new this(elem[0].get("argument") as any)
            )
        else for(const inclusion of src.get("elements"))
            parent.add(
                new this(inclusion as any)
            )
    }
    
    static applyTo(parent: ElementInline, path: Path<Expression>){
        parent.add(
            new this(path)
        )
    }

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