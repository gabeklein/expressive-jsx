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

export class parsedArgumentBody {
    constructor(e) {
        if(e.type in this)
            return [].concat(
                this.Type(e)
            )
    }

    Type(e){
        if(!e.node) debugger
        if(e.node.extra && e.node.extra.parenthesized)
            return e.node;

        return this[e.type] 
            && this[e.type](e) 
            || e.node;
    }

    ExpressionStatement(e){
        return this.Type(e.get("expression"))
    }

    Identifier(e){
        return e.node.name;
    }

    StringLiteral(e){
        return e.node.value;
    }

    BinaryExpression(e){
        const {left, right, operator} = e.node;
        if(operator != "-")
            throw e.buildCodeFrameError(`only "-" operator is allowed here`)
        if( t.isIdentifier(left) && t.isIdentifier(right) && right.start == left.end + 1 )
            return left.name + "-" + right.name;
        else 
            throw e.buildCodeFrameError(`expression must only be comprised of identifiers`)
    }

    UnaryExpression(e){
        const arg = e.get("argument");
        node = arg.node;
        if(e.node.operator == "-" && arg.isNumericLiteral())
            return this.NumericLiteral(e, -1)
        else return node;
    }

    NumericLiteral(e, sign = 1){
        const { raw, rawValue, parenthesized } = e.node.extra;
        if(parenthesized || !/^0x/.test(raw))
            return sign*rawValue;
        else {
            if(sign < 0)
                throw e.buildCodeFrameError(`Hexadecimal numbers are converted into HEX coloration so negative sign doesn't mean anything here.\nParenthesize the number if you really need "-${rawValue}" for some reason...`)
            return HEX_COLOR(raw);
        }
    }

    SequenceExpression(e){
        return e.get("expressions").map(e => this.Type(e))
    }

    ArrowFunctionExpression(e){
        throw e.buildCodeFrameError("Arrow Function not supported yet")
    }

    CallExpression(e){
        const callee = e.get("callee");

        if(!callee.isIdentifier())
            throw callee.buildCodeFrameError("Only the identifier of another modifier may be called within another modifier.")

        return {
            named: callee.node.name,
            location: callee,
            inner: e.get("arguments").map(e => this.Type(e))
        };
    }

    EmptyStatement(){
        return null;
    }

    NullLiteral(){
        return null;
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
            .substring(0, 6);
        if(inherited)
            this.inherits = inherited;
        this.insertDoIntermediate(body)
    }   

    get handler(){
        return (body, recipient) => {
            if(body.type == "BlockStatement"){
                const usingName = this.name;
                const inheriting = this;
                new exports[Opts.reactEnv](usingName, body, inheriting).declare(recipient);
            }
            else {
                const params = new parsedArgumentBody(body);
                this.invoke( recipient, params, false )
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

    didExitOwnScope(path){
        if(this.props.length)
            this.type = "props"
        if(this.style.length)
            this.type = this.type ? "both" : "style"
        super.didExitOwnScope(path)
    }
}

export class InlineComponentModifier extends ComponentModifier {

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

export class NextJSComponentModifier extends InlineComponentModifier {

    style_static = [];

    constructor(name, body, inherited) {
        super(...arguments)
        this.classname = `${this.name}-${this.hash}`
    }

    declare(recipient){
        super.declare(recipient);
        recipient.context.program.computedStyleMayInclude(this);
        recipient.context.entry.computedStyleMayInclude(this);
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
}

export {
    InlineComponentModifier as native,
    NextJSComponentModifier as next
    // NativeComponentModifier as next
}