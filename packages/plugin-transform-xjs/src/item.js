const t = require('@babel/types');
const { transform, Opts, Shared } = require("./shared");
const { HEX_COLOR } = require("./attributes")

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
            return t.SpreadElement(this.value)
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

export class SyntheticProp extends Attribute {

    inlineType = "props"
    precedence = 1

    constructor(name, value) {
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

    inlineType = "props"
    precedence = 1

    static applyTo(parent, path){
        if( path.node.left.name == "style"){
            this.applyStyle(parent, path);
            return
        }
        if(path.node.operator != "=") 
            path.buildCodeFrameError("Only `=` assignment may be used here.")

        parent.add( 
            new this(path)
        )
    }

    static applyStyle(parent, path){
        const spread = new this(path);

        spread.kind = "style";
        spread.inlineType = "style";
        spread.isSpread = true;
        spread.type = "SpreadElement"

        parent.add(
            spread
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

        const name = this.name = node.left.name;

        if(name != "style"){
            if( t.isNumericLiteral(value))
                return /^0x/.test(extra.raw)
                    ? HEX_COLOR(extra.raw)
                    : extra.rawValue
            else if(t.isStringLiteral(value))
                return value.value;
        }
    }

    get value(){
        return super.value || this.path.node.right;
    }
}

export class ExplicitStyle {

    constructor(name, value) {
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
                this.static = false;
                this.inlineType = "style";
                this.value = value.node || value;
        }
    }

    get asString(){
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

    get asProperty(){
        let { value, static: stat } = this;
        if(stat && typeof stat == "string")
            value = t.stringLiteral(stat.replace(/\s+/g, " "));
        return t.objectProperty(this.id, value);
    }

    asAssignedTo(target){
        return t.expressionStatement(
            t.assignmentExpression("=",
                t.memberExpression(target, this.id), this.value
            )
        )
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
        this.node = path.node;
    }
}

export class NonComponent {

    inlineType = "child"

    constructor(src){
        if(src.node)
            this.path = src,
            this._node = src.node
        else
            this._node = src

        if(this._node.type == "StringLiteral")
            this.precedence = 4
        else
            this.precedence = 3 
    }
    
    static applyMultipleTo(parent, src){
        const elem = src.get("elements");
        if(elem.length == 1 && elem[0].isSpreadElement())
            parent.add(
                new this(elem[0].get("argument"))
            )
        else for(const inclusion of src.get("elements"))
            parent.add(
                new this(inclusion)
            )
    }
    
    static applyTo(parent, path){
        parent.add(
            new this(path)
        )
    }

    get node(){
        return this._node || this.path.node;
    }

    outputInline(){
        return this.node;
    }

    transform(){
        return { product: this.node }
    }

    collateChildren(){
        return {
            output: [].concat(this.node)
        }
    }
}

export class QuasiComponent extends NonComponent {
    static applyTo(parent, path){
        const node = new this(path);
        node.parent = parent;
        parent.add(node)
    }

    get node(){
        const { name } = this.parent.tags[0]; 
        const string_only = 
            // Opts.reactEnv == "native" || 
            // this.parent.typeInformation.type.type != "StringLiteral";
            /^[A-Z]/.test(name) && name != "Text";

        return this.breakdown(string_only)
    }

    breakForString(quasi, then, items, INDENT, i, quasis){
        for(let x of ["raw", "cooked"]){
            let text = quasi.value[x];
            if(INDENT) text = text.replace(INDENT, "\n");
            if(i == 0) text = text.replace("\n", "")
            if(i == quasis.length - 1)
                text = text.replace(/\s+$/, "")
            quasi.value[x] = text
        }
    }

    breakForNative(quasi, then, items, INDENT){
        let text = quasi.value.cooked;
        if(INDENT) 
            text = text.replace(INDENT, "\n");
        const lines = text.split(/(?=\n)/g);

        for(let line, j=0; line = lines[j]; j++)
            if(line[0] == "\n"){
                if(lines[j+1] || then){
                    items.push(
                        new NonComponent(
                            t.stringLiteral("\n")))
                    items.push(
                        new NonComponent(
                            t.stringLiteral(
                                line.substring(1))))
                }
            }
            else items.push(
                new NonComponent(
                    t.stringLiteral( line )))
        
        if(then) items.push(new NonComponent(then));
    }

    breakWithBR(quasi, then, items, INDENT, i){
        const ELEMENT_BR = transform.createElement("br");
        let text = quasi.value.cooked;
        if(INDENT) 
            text = text.replace(INDENT, "\n");
        const lines = text.split(/(?=\n)/g);

        for(let line, j=0; line = lines[j]; j++)
            if(line[0] == "\n"){
                if(lines[j+1] || then){
                    items.push({node: ELEMENT_BR})
                    items.push(
                        new NonComponent(
                            t.stringLiteral(
                                line.substring(1))))
                }
            }
            else items.push(
                new NonComponent(
                    t.stringLiteral( line )))
        
        if(then) items.push(new NonComponent(then));
    }

    breakdown(string_only){
        const quasi = this._node;
        const { quasis, expressions } = quasi;

        if( Opts.output == "JSX" && 
            quasis.find(element => /[{}]/.exec(element.value.raw))
        )   return quasi;

        if(expressions.length == 0)
            return t.stringLiteral(quasis[0].value.raw)

        let INDENT = /^\n( *)/.exec(quasis[0].value.cooked);
        INDENT = INDENT && new RegExp("\n" + INDENT[1], "g");

        const items = [];

        const split = 
            string_only ?
                this.breakForString :
            Opts.reactEnv == "native" ?
                this.breakForNative :
                this.breakWithBR;

        for(let i=0; i < quasis.length; i++)
            split(quasis[i], expressions[i], items, INDENT, i, quasis);

        if(string_only)
            return quasi;
        else {
            if(INDENT) items.shift();
            return items.map(x => x.node)
        }
    }
}