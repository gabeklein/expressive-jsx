import { 
    NumericLiteral, 
    Path, 
    Expression, 
    Statement,
    BunchOf
} from "./types";

import { 
    toArray, 
    Opts, 
    inParenthesis
} from "./internal";

export function HEX_COLOR(n: string){
    let raw = n.substring(2);

    if(raw.length == 1)
        raw = "000" + raw
    else 
    if(raw.length == 2){
        raw = "000000" + raw
    }
    
    if(raw.length % 4 == 0){
        let decimal = [] as any[];

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

export function parseArguments(e: Path<Expression | Statement>){
    return toArray(parse(e));
}

function parse(e: Path<Expression | Statement>){
    if(e.isExpression() && inParenthesis(e) || !(e.type in Types))
        return {
            type: "verbatim",
            path: e
        }
    else
        return Types[e.type](e);
}

const Types: BunchOf<Function> = {

    NumericLiteral(number: Path<NumericLiteral>, sign = 1){
        const { raw, rawValue } = number.node as any;
        if(inParenthesis(number) || !/^0x/.test(raw))
            return sign*rawValue;
        else {
            if(sign < 0)
                throw number.buildCodeFrameError(`Hexadecimal numbers are converted into colors (#FFF) so negative sign doesn't mean anything here.\nParenthesize the number if you really need "-${rawValue}" for some reason...`)
            return HEX_COLOR(raw);
        }
    },

    ExpressionStatement(e: any){
        return parse(e.get("expression"))
    },

    Identifier(e: any){
        return e.node.name;
    },

    StringLiteral(e: any){
        return e.node.value;
    },

    TemplateLiteral(e: any){
        return e; 
    },

    BinaryExpression(e: any){
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
                left: parse(e.get("left")),
                right: parse(e.get("right")),
                nodePath: e
            };
    },

    UnaryExpression(e: any){
        const arg = e.get("argument");
        if(e.node.operator == "-" && arg.isNumericLiteral())
            return this.NumericLiteral(arg, -1)
        else if(e.node.operator == "!")
            return {
                type: "verbatim",
                path: arg
            }
        else throw e.buildCodeFrameError("Unary operator here doesn't do anything")
        // else return e;
    },
    
    SequenceExpression(e: any){
        return e.get("expressions").map(parse)
    },

    ArrowFunctionExpression(e: any){
        throw e.buildCodeFrameError("Arrow Function not supported yet")
    },

    CallExpression(e: any){
        const callee = e.get("callee");

        if(!callee.isIdentifier())
            throw callee.buildCodeFrameError("Only the identifier of another modifier may be called within another modifier.")

        return {
            named: callee.node.name,
            location: callee,
            inner: e.get("arguments").map((e: any) => parse(e))
        };
    },

    BlockStatement(){
        debugger
        throw new Error("Unexpected Block Statement in modifier processor, this is an internal error.")
    },

    EmptyStatement(){
        return null;
    },

    NullLiteral(){
        return null;
    }
}