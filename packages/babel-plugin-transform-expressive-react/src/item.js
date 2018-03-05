import { transform } from './shared';

const t = require('babel-types')
const { Opts } = require("./shared");

const CSS_EXPECTING_UNITS = new Set(`
    width
    height
    maxWidth
    maxHeight
    margin
    marginTop
    marginBottom
    marginLeft
    marginRight
    padding
    paddingLeft
    paddingRight
    paddingTop
    paddingBottom
    fontSize
    lineHeight
`.trim().split(/[\n\r\s]+/));

function HEX_COLOR(n){
    let raw = n.substring(2), out;

    if(raw.length % 4 == 0){
        let decimal = [];

        if(raw.length == 4)
            // (shorthand) 'F...' -> "FF" -> 0xFF
            decimal = Array.from(raw).map(x => parseInt(x+x, 16))

        else for(let i = 0; i < 4; i++){
            decimal.push(
                parseInt(raw.slice(i, i+2), 16)
            );
        }
            

        //range 0:1 for opacity, fixed to prevent long decimals like 1/3
        decimal[3] = (decimal[3] / 255).toFixed(2)

        return `rgba(${ decimal.join(",") })`
    }
    else return "#" + raw;
}

export class Attribute {

    constructor(path){
        this.path = path;
    }

    get id(){
        return t.identifier(this.name);
    }

    get value(){
        const value = this.static;
        if(value) switch(typeof value){
            case "string": return t.stringLiteral(value)
            case "number": return t.numericLiteral(value)
        }
    }

    get asProperty(){
        const { name, value, isSpread } = this;
        if(isSpread){
            return t.spreadProperty(this.value)
        } else {
            if(!name) {
                throw new Error("Internal Error: Prop has no name!")
            }
            return t.objectProperty(t.identifier(this.name), this.value)
        }
    }

    asAssignedTo(target){
        const { name, isSpread } = this;
        let assign;

        if(isSpread){
            assign = t.callExpression(
                t.memberExpression(
                    t.identifier("Object"),
                    t.identifier("assign")
                ), 
                [   target, this.value   ]
            )
        } else {
            if(!name) {
                debugger
                throw new Error("Internal Error: Prop has no name!")
            }
            assign = t.assignmentExpression("=",
                t.memberExpression(target, t.identifier(name)), this.value
            )
        }

        return t.expressionStatement(assign);
    }
}

export class Prop extends Attribute {

    inlineType = "props"
    precedence = 1

    static applyTo(parent, path){
        if(path.node.operator != "=") 
            path.buildCodeFrameError("Only `=` assignment may be used here.")
        parent.add( 
            new this(path)
        )
    }

    constructor(path){
        super(path)
        const { computed } = this;
        if(computed){
            this.static = computed;
            delete this.precedence;
        }
    }

    get computed(){
        let value;
        const { node } = this.path;
        const { extra } = value = node.right;

        this.name = node.left.name;

        if( t.isNumericLiteral(value))
            return /^0x/.test(extra.raw)
                ? HEX_COLOR(extra.raw)
                : extra.rawValue
        else if(t.isStringLiteral(value))
            return value.value;
    }

    get value(){
        return super.value || this.path.node.right;
    }
}

export class Style extends Attribute {

    inlineType = "style"
    precedence = 2

    static applyTo(parent, path){
        parent.add( 
            new this(path)
        );
    }

    constructor(path){
        super(path.get("body.expression"))
        this.name = path.node.label.name;

        const { computed } = this;
        if(computed){
            this.static = computed;
            delete this.precedence;
        }
    }

    get value(){
        return super.value || this.path.node;
    }

    get computed(){
        const { path } = this;
        const { node } = path;
        const { extra } = node;

        if(extra && extra.parenthesized) return;

        switch(node.type){

            case "Identifier":
                return node.name

            case "BinaryExpression": {
                const {left, right} = node
                if(
                    t.isIdentifier(left) && 
                    t.isIdentifier(right) && 
                    right.start == left.end + 1
                ) 
                    return left.name + "-" + right.name;
            }

            case "StringLiteral":
                return node.value;

            case "NumericLiteral": {
                if(extra && /^0x/.test(extra.raw))
                    return HEX_COLOR(extra.raw)
                else if(Opts.applicationType != "native" && CSS_EXPECTING_UNITS.has(this.name))
                    return `${extra.rawValue}px`
                else return extra.rawValue;
            }

            case "SequenceExpression": {
                const {expressions: e} = node;
                let value = "";
                if(e[0].type == "NumericLiteral"){
                    value += e[0].value;
                    if(e[1].type == "Identifier")
                        value += e[1].name;
                }
                return value;
            }

            case "ArrowFunctionExpression":
                throw path.buildCodeFrameError("Dynamic CSS values not yet supported");
        }
    }
}

export class Statement {

    inlineType = "stats"

    static applyTo(parent, path, mod){
        parent.add( 
            new this(path, mod)
        )
    }

    output(){
        return this.node;
    }

    constructor(path, kind){
        this.kind = kind;
        if(kind != "debug")
            this.node = path.node;
    }
}

export class ChildNonComponent {

    inlineType = "child"
    
    precedence = 3

    static applyMultipleTo(parent, src){
        for(const inclusion of src.get("elements"))
            parent.add(
                new this(inclusion)
            )
    }

    static applyVoidTo(parent){
        if(Opts.ignoreExtraSemicolons == false)
            parent.add(
                new this(t.booleanLiteral(false))
            )
    }

    static applyTo(parent, path){
        parent.add(
            new this(path)
        )
    }

    outputInline(){
        return this.path.node;
    }

    transform(){
        return { product: this.path.node }
    }

    collateChildren(){
        return {
            output: [ this.path.node ]
        }
    }

    constructor(src){
        this.path = src
    }
}