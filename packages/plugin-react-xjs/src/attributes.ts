import { 
    Path, 
    BunchOf
} from "./types";

import {
    NumericLiteral, 
    Expression, 
    Statement,
    TemplateLiteral,
    StringLiteral,
    Identifier,
    BinaryExpression,
    UnaryExpression,
    SequenceExpression,
    ArrowFunctionExpression,
    CallExpression,
    ExpressionStatement,
    SpreadElement,
} from "@babel/types"

import { 
    toArray, 
    Opts, 
    inParenthesis
} from "./internal";

export function parseArguments(e: Path<Expression | Statement>): DelegateType[] {
    return toArray(parse(e));
}

export function HEXColor(raw: string){
    raw = raw.substring(2);

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

function parse(e: Path<Expression | Statement | SpreadElement>) {
    if(e.isExpression() && (inParenthesis(e) || !(e.type in Types)))
        return new DelegatePassThru(e, "expression");
    else
        return (Types as BunchOf<Function>) [e.type](e) as DelegateType;
}

const Types = {
    ExpressionStatement(e: Path<ExpressionStatement>): DelegateType {
        return parse(e.get("expression"))
    },

    Identifier(e: Path<Identifier>){
        return new DelegateWord(e.node.name, "identifier");
    },

    StringLiteral(e: Path<StringLiteral>){
        return new DelegateWord(e.node.value, "string");
    },

    TemplateLiteral(e: Path<TemplateLiteral>): DelegatePassThru {
        return new DelegatePassThru(e, "template");
    },

    UnaryExpression(e: Path<UnaryExpression>){
        const arg = e.get("argument");
        if(e.node.operator == "-" && arg.isNumericLiteral())
            return this.NumericLiteral(arg, -1)
        else if(e.node.operator == "!")
            return new DelegatePassThru(arg, "verbatim");
        else throw e.buildCodeFrameError("Unary operator here doesn't do anything")
    },

    NumericLiteral(number: Path<NumericLiteral>, sign = 1): DelegateNumeric | DelegateColor {
        const { raw, rawValue } = number.node as any;
        if(inParenthesis(number) || !/^0x/.test(raw))
            return new DelegateNumeric(sign*rawValue);
        else {
            if(sign == -1)
                throw number.buildCodeFrameError(`Hexadecimal numbers are converted into colors (#FFF) so negative sign doesn't mean anything here.\nParenthesize the number if you really need "-${rawValue}" for some reason...`)
            return new DelegateColor(HEXColor(raw));
        }
    },

    BinaryExpression(e: Path<BinaryExpression>): DelegateBinary | DelegateWord {
        const {left, right, operator} = e.node;
        if(operator == "-" && left.type == "Identifier"  && right.type == "Identifier" && right.start == left.end! + 1 )
            return new DelegateWord(left.name + "-" + right.name);
        else 
            return new DelegateBinary(e);
    },
    
    SequenceExpression(e: Path<SequenceExpression>): DelegateGroup {
        return new DelegateGroup(e.get("expressions"));
    },

    CallExpression(e: Path<CallExpression>): DelegateCall {
        return new DelegateCall(e);
    },

    ArrowFunctionExpression(e: Path<ArrowFunctionExpression>){
        throw e.buildCodeFrameError("Arrow Function not supported yet")
    },

    BlockStatement(){
        throw new Error("Unexpected Block Statement in modifier processor, this is an internal error.")
    },

    EmptyStatement(){
        return;
    },

    NullLiteral(){
        return null;
    }
}

abstract class DelegateType {}

export type DelegateItem 
    = DelegateBinary
    | DelegateColor
    | DelegateWord
    | DelegateNumeric
    | DelegateGroup
    | DelegateCall
    | DelegatePassThru 

export class DelegateBinary  extends DelegateType {
    type = "binary"
    operator: string;
    left: DelegateType
    right: DelegateType 

    constructor(
        public path: Path<BinaryExpression> ){

        super();
        this.operator = path.node.operator
        this.left = parse(path.get("left"))
        this.right = parse(path.get("right"))
    }
}

export class DelegateWord extends DelegateType {
    type = "string"

    constructor(
        public value: string, 
        public kind: "string" | "identifier" | "color" = "string" ){

        super();
    }
}

export class DelegateNumeric extends DelegateType {
    type = "number";

    constructor(
        public value: number ){

        super();
    }
}

export class DelegateColor extends DelegateType {
    type = "color";

    constructor(
        public value: string ){
            
        super();
    }
}

export class DelegateGroup  extends DelegateType {
    type = "group";
    inner: DelegateType[]

    constructor(
        paths: Path<Expression>[] ){
            
        super();
        this.inner = paths.map(parse)
    }
}

export class DelegateCall extends DelegateType {
    type = "call"
    name: string
    callee: Path<Identifier>
    inner: DelegateType[]

    constructor(path: Path<CallExpression>){
        super();

        const callee = path.get("callee");
        const args = path.get("arguments") as Path<Expression | SpreadElement>[];

        if(!callee.isIdentifier())
            throw callee.buildCodeFrameError("Only the identifier of another modifier may be called within another modifier.")

        this.name = callee.node.name;
        this.callee = callee;
        this.inner = args.map(parse)
    }
}

export class DelegatePassThru extends DelegateType {
    type = "expression";

    constructor(
        public path: Path<Expression>, 
        public kind: "verbatim" | "expression" | "template" | "spread" ){

        super();
    }
}

export class DelegateRequires extends DelegateType {
    type = "require"

    constructor(
        public module: string ){  

        super();
    }
}