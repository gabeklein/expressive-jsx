import { transform } from './shared';

const t = require('babel-types')
const { Opts } = require("./shared");


class Attribute {

    constructor(path){
        this.path = path;
    }

    get asProperty(){
        return this.id
            ? t.objectProperty(this.id, this.value)
            : t.spreadProperty(this.value)
    }

    asAssignedTo(target){
        const assignment = this.id
            ? t.assignmentExpression("=",
                t.memberExpression(target, this.id), t.value
            )
            : t.callExpression(
                t.memberExpression(
                    t.identifier("Object"),
                    t.identifier("assign")
                ), 
                [   target, t.value   ]
            )
        return t.expressionStatement(assignment);
    }
}

export class Prop extends Attribute {

    groupType = "props"
    precedence = 1

    constructor(path){
        super(path)
        this.name = path.node.left.name;
    }

    static applyTo(parent, path){
        if(path.node.operator != "=") 
            path.buildCodeFrameError("Only `=` assignment may be used here.")
        parent.add( 
            new this(path)
        )
    }

    get id(){
        return this.path.node.left;
    }

    get value(){
        return this.path.node.left;
    }
}

export class Style extends Attribute {

    groupType = "style"
    precedence = 2

    constructor(path){
        super(path)
        this.name = path.node.label.name;
    }

    static applyTo(parent, path){
        parent.add( 
            new this(path)
        );
    }

    get id(){
        return path.node.label;
    }

    get value(){
        const exp = this.path.get("body.expression")
        let value = exp.node;

        if(value.extra && value.extra.parenthesized) /*don't format*/;
        else switch(value.type){
            case "BinaryExpression": {
                const {left, right} = value
                if(
                    t.isIdentifier(left) && 
                    t.isIdentifier(right) && 
                    left.end == right.start - 1
                ) value = t.stringLiteral(left.name + "-" + right.name);
                break;
            }

            case "ArrowFunctionExpression":
                throw exp.buildCodeFrameError("Dynamic CSS values not yet supported");

            case "NumericLiteral": {
                const {extra} = value;
                if(extra && /^0x/.test(extra.raw))
                    value = t.stringLiteral(extra.raw.replace("0x", "#"))
                break;
            }

            case "SequenceExpression": {
                const {expressions: e} = value;
                let val = "";
                if(e[0].type == "NumericLiteral"){
                    val += e[0].value;
                    if(e[1].type == "Identifier")
                        val += e[1].name;
                }
                value = t.stringLiteral(val);
                break;
            }

            case "Identifier":
                value = t.stringLiteral(value.name);
            break;
        }
        
        return value;
    }
    
}

export class Statement {

    groupType = "stats"
    precedence = 0

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

    groupType = "inner"
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

    get outputInline(){
        return this.path.node;
    }

    outputAccumulating(){
        return { product: this.path.node }
    }

    constructor(src){
        this.path = src
    }
}