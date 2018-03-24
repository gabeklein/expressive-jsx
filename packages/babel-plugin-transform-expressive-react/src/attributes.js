const { AttrubutesBody } = require("./component");
const { createHash } = require('crypto');
const t = require("babel-types");
const { Opts, Shared, transform } = require("./shared");

function HEX_COLOR(n){
    let raw = n.substring(2), out;

    if(raw.length % 4 == 0){
        let decimal = [];

        if(Opts.reactEnv == "native")
            return "#" + raw;

        if(raw.length == 4)
            // (shorthand) 'F.' -> "FF..." -> 0xFF
            decimal = Array.from(raw).map(x => parseInt(x+x, 16))

        else for(let i = 0; i < 4; i++){
            decimal.push(
                parseInt(raw.slice(i*2, i*2+2), 16)
            );
        }

        //decimal for opacity, fixed to prevent repeating like 1/3
        decimal[3] = (decimal[3] / 255).toFixed(2)

        return `rgba(${ decimal.join(",") })`
    }
    else return "#" + raw;
}

export function invocationArguments(exp){
    switch(exp.type){

        case "Identifier": {
            const value = exp.node.name;
            return value;
        }

        case "BinaryExpression": {
            const {left, right, operator} = exp.node;
            if(operator != "-")
                throw exp.buildCodeFrameError(`only "-" operator is allowed here`)
            if( t.isIdentifier(left) && t.isIdentifier(right) && right.start == left.end + 1 )
                return left.name + "-" + right.name;
            else 
                throw exp.buildCodeFrameError(`expression must only be comprised of identifiers`)
            break;
        }

        case "StringLiteral": 
            return exp.node.value;

        case "NumericLiteral": {
            const { raw, rawValue, parenthesized } = exp.node.extra;
            if(parenthesized || !/^0x/.test(raw))
                return rawValue
            else {
                const value = HEX_COLOR(raw);
                value.fromHex = raw;
                return value;
            }
        }

        case "SequenceExpression":
            return exp.get("expressions").map(invocationArguments);

        case "ArrowFunctionExpression":
            throw exp.buildCodeFrameError("ok what? you're putting a function here why?")
    }
}

class ComponentModifier extends AttrubutesBody {

    precedence = 0

    constructor(name, body, inherited){
        super()
        this.name = name;
        if(inherited)
            this.inherits = inherited;
        this.insertDoIntermediate(body)
    }   

    get handler(){
        return (body, recipient) => {
            switch(body.type){
                case "ExpressionStatement":
                    const params = [].concat( this.invocationArguments( body.get("expression") ) );
                    this.invoke( recipient, params, false )
                    break;

                case "BlockStatement": 
                    const usingName = this.name;
                    const inheriting = this;
                    new Modifier(usingName, body, inheriting).declare(recipient);
                    break;

                case "IfStatement":
                    throw body.buildCodeFrameError("IDK what to do with this")
            }
        }
    }

    declare(recipient){
        recipient.context.declare(this);
    }

    didEnterOwnScope(path){
        //TODO GET RID OF SCOPE
        this.scope = path.scope
        super.didEnterOwnScope(path)
    }

    didExitOwnScope(){
        if(this.props.length)
            this.type = "props"
        if(this.style.length)
            this.type = this.type ? "both" : "style"
    }
}

class WebComponentModifier extends ComponentModifier {

    constructor(name, body, inherited) {
        super(...arguments)
        this.insertDoIntermediate(path)
        this.hash = createHash("md5")
            .update(path.getSource())
            .digest('hex')
            .substring(0, 6);
    }

    generateJSXStyleNode(){
        
    }

    declare(recipient){
        super.declare(recipient)
        // recipient.context.root.declareStyle
    }
    
}

class NativeComponentModifier extends ComponentModifier {

    inlineType = "stats"

    declare(recipient){
        super.declare(recipient);
        recipient.add(this);
    }

    invoke(target, args, inline){
        if(!inline && !args.length) return;
        debugger
    }

    output(){
        let { props, style } = this;
        let declaration;

        props = props.length && t.objectExpression(props.map(x => x.asProperty));
        style = style.length && t.objectExpression(style.map(x => x.asProperty));

        declaration = 
            ( this.type == "both" )
            ? t.objectExpression([
                t.objectProperty(t.identifier("props"), props),
                t.objectProperty(t.identifier("style"), style)
            ]) 
            : props || style;

        if(declaration){
            const id = this.id = this.scope.generateUidIdentifier(this.name)
            return t.variableDeclaration("const", [
                t.variableDeclarator(
                    id, declaration
                )
            ])
        }
    }

    into(inline){

        if(this.also) this.also.into(inline);

        const { style, props, css } = inline;
        const { id } = this; 
        
        if(this.props.length && this.style.length){
            props.push(t.spreadProperty(
                t.memberExpression(
                    id, t.identifier("props")
                )
            ))
            style.push(t.spreadProperty(
                t.memberExpression(
                    id, t.identifier("style")
                )
            ))
        }
        else {
            inline[this.type].push(
                t.spreadProperty(id)
            );
        }
    }
}

export const Modifier = 
    Opts.reactEnv != "native"
        ? NativeComponentModifier 
        : WebComponentModifier;