const { AttrubutesBody } = require("./component");
const { createHash } = require('crypto');
const t = require("babel-types");
const { Opts, Shared, transform } = require("./shared");

export function HEX_COLOR(n){
    let raw = n.substring(2), out;

    if(raw.length == 1)
        raw = "000" + raw[0]
    else 
    if(raw.length == 2){
        const [a, b] = raw;
        raw = a + a + a + b;
    }
    
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
    let sign = 1;
    let { node } = exp;

    if(node.extra && node.extra.parenthesized)
        return node;

    switch(exp.type){

        case "Identifier": {
            const value = node.name;
            return value;
        }

        case "BinaryExpression": {
            const {left, right, operator} = node;
            if(operator != "-")
                throw exp.buildCodeFrameError(`only "-" operator is allowed here`)
            if( t.isIdentifier(left) && t.isIdentifier(right) && right.start == left.end + 1 )
                return left.name + "-" + right.name;
            else 
                throw exp.buildCodeFrameError(`expression must only be comprised of identifiers`)
            break;
        }

        case "StringLiteral": 
            return node.value;

        case "UnaryExpression": {
            const arg = exp.get("argument");
            node = arg.node;
            if(exp.node.operator == "-" && arg.isNumericLiteral())
                sign = -1, exp = arg;
                //continue to numeric case
            else return node;
        }

        case "NumericLiteral": {
            const { raw, rawValue, parenthesized } = node.extra;
            if(parenthesized || !/^0x/.test(raw))
                return sign*rawValue;
            else {
                if(sign < 0)
                    throw exp.buildCodeFrameError(`Hexadecimal numbers are converted into HEX coloration so negative sign doesn't mean anything here.\nParenthesize the number if you really need "-${rawValue}" for some reason...`)
                return HEX_COLOR(raw);
            }
        }

        case "CallExpression": {
            const callee = exp.get("callee");
            
            if(!callee.isIdentifier())
                throw callee.buildCodeFrameError("Only the identifier of another modifier may be called within another modifier.")

            return {
                named: callee.node.name,
                location: callee,
                inner: exp.get("arguments").map(invocationArguments)
            };
        }

        case "NullLiteral":
            return null;

        case "SequenceExpression":
            return exp.get("expressions").map(invocationArguments);

        case "ArrowFunctionExpression":
            throw exp.buildCodeFrameError("ok what? you're putting a function here why?")

        default:
            return node;
    }
}

class ComponentModifier extends AttrubutesBody {

    precedence = 0

    constructor(name, body, inherited){
        super()
        this.name = name;
        this.hash = createHash("md5")
            .update(body.getSource())
            .digest('hex')
            .substring(0, 3);
        if(inherited)
            this.inherits = inherited;
        this.insertDoIntermediate(body)
    }   

    get handler(){
        return (body, recipient) => {
            switch(body.type){
                case "ExpressionStatement":
                    const params = [].concat( invocationArguments( body.get("expression") ) );
                    this.invoke( recipient, params, false )
                    break;

                case "EmptyStatement":
                    this.invoke( recipient, [ null ], false );
                    break;

                case "BlockStatement": 
                    const usingName = this.name;
                    const inheriting = this;
                    new exports[Opts.reactEnv](usingName, body, inheriting).declare(recipient);
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

export class NativeComponentModifier extends ComponentModifier {

    inlineType = "stats"

    declare(recipient){
        super.declare(recipient);
        recipient.add(this);
    }

    invoke(target, args, inline){
        if(!inline && !args.length) return;
        this.into(inline)
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
        if(this.inherits) this.inherits.into(inline);

        if(!this.style.length) return

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

export class NextJSComponentModifier extends NativeComponentModifier {

    style_static = [];

    constructor(name, body, inherited) {
        super(...arguments)
        this.classname = `${this.name}-${this.hash}`
    }

    declare(recipient){
        super.declare(recipient);
        recipient.context.entry.styleBlockMayInclude(this);
    }

    invoke(target, args, inline){
        if(!inline && !args.length) return;
        this.into(inline)
    }

    into(inline){
        if(this.style_static !== this.style && this.style_static.length)
            inline.css.push(this.classname)
        super.into(inline);
    }
 
    generateCSS(){
        let { style_static: style, classname } = this;
        return `.${classname} { ${
            style.map(x => x.asString).join("")
        } }`
    }
}

export {
    NativeComponentModifier as native,
    NativeComponentModifier as next
    // NextJSComponentModifier as next
}