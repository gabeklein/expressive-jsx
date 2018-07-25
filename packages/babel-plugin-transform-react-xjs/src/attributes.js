
const t = require("babel-types");
const { Opts, Shared, transform } = require("./shared");

export function HEX_COLOR(n){
    let raw = n.substring(2), out;

    if(raw.length == 1)
        raw = "000" + raw
    else 
    if(raw.length == 2){
        raw = "000000" + raw
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
        decimal[3] = (decimal[3] / 255).toFixed(3)

        return `rgba(${ decimal.join(",") })`
    }
    else return "#" + raw;
}

export class parsedArgumentBody {
    constructor(e) {
        if(e.type && e.type in this)
            return [].concat(
                this.Type(e)
            )
        return e
    }

    BlockStatement(){
        debugger
        throw new Error("Unexpected Block Statement in modifier processor, this is an internal error.")
    }

    Type(e){
        if(!e.node) debugger
        if(e.node.extra && e.node.extra.parenthesized)
             return e;
        
        if(e.type in this){
            const x = this[e.type](e);
            // if(x.type) debugger
            return x;
        } else {
            // debugger
            return e
        }
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
        if(operator == "-" 
        && left.type == "Identifier"
        && right.type == "Identifier"
        && right.start == left.end + 1 )
            return left.name + "-" + right.name;
        else 
            return {
                type: "binary",
                operator,
                left: left.name || left.value,
                right: right.name || right.value,
            };
    }

    UnaryExpression(e){
        const arg = e.get("argument");
        if(e.node.operator == "-" && arg.isNumericLiteral())
            return this.NumericLiteral(arg, -1)
        else if(e.node.operator == "!" && arg.isCallExpression())
            return arg
        else throw e.buildCodeFrameError("Unary operator here doesn't do anything")
        // else return e;
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