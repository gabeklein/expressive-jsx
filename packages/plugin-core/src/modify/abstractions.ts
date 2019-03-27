import t, {
    ArrowFunctionExpression,
    BinaryExpression,
    CallExpression,
    Expression,
    Identifier,
    NullLiteral,
    NumericLiteral,
    SequenceExpression,
    Statement,
    StringLiteral,
    TemplateLiteral,
    UnaryExpression,
} from '@babel/types';
import { inParenthesis, Opts } from 'internal';
import { Path } from 'types';
import { ParseErrors } from 'shared';

const Error = ParseErrors({
    StatementAsArgument: "Cannot parse statement as a modifier argument!",
    UnaryUseless: "Unary operator here doesn't do anything",
    HexNoNegative: "Hexadecimal numbers are converted into colors (#FFF) so negative sign doesn't mean anything here.\nParenthesize the number if you really need \"-{1}\" for some reason...",
    ArrowNotImplemented: "Arrow Function not supported yet",
    ArgumentSpread: "Cannot parse argument spreads for modifier handlers",
    UnknownArgument: "Unknown argument while parsing for modifier.",
    MustBeIdentifier: "Only Identifers allowed here! Call expression must reference another modifier."
})

function HEXColor(raw: string){
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

const Arguments = new class DelegateTypes {

    [type: string]: (...args: any[]) => DelegateAbstraction;

    Parse(element: Path<Expression> | Path<Statement>): DelegateAbstraction {

        if(element.isStatement()){
            if(element.isExpressionStatement())
                element = element.get("expression");
            else 
                throw Error.StatementAsArgument(element) 
        }
    
        const Handler = Arguments[element.type];
    
        if(inParenthesis(element) || !Handler)
            return new DelegateExpression(element, "expression");
        else
            return Handler(element);
    }

    Identifier(e: Path<Identifier>){
        return new DelegateWord(e.node.name, "identifier");
    }

    StringLiteral(e: Path<StringLiteral>){
        return new DelegateWord(e.node.value, "string");
    }

    TemplateLiteral(e: Path<TemplateLiteral>): DelegateExpression {
        return new DelegateExpression(e, "template");
    }

    UnaryExpression(e: Path<UnaryExpression>){
        const arg = e.get("argument");
        if(e.node.operator == "-" && arg.isNumericLiteral())
            return this.NumericLiteral(arg, -1)
        else if(e.node.operator == "!")
            return new DelegateExpression(arg, "verbatim");
        else throw Error.UnaryUseless(e) 
    }

    NumericLiteral(number: Path<NumericLiteral>, sign = 1): DelegateNumeric | DelegateColor {
        const { raw, rawValue } = number.node as any;
        if(inParenthesis(number) || !/^0x/.test(raw))
            return new DelegateNumeric(sign*rawValue);
        else {
            if(sign == -1)
                throw Error.HexNoNegative(number, rawValue) 
            return new DelegateColor(HEXColor(raw));
        }
    }

    NullLiteral(_e: Path<NullLiteral>){
        return null;
    }

    BinaryExpression(e: Path<BinaryExpression>): DelegateBinary | DelegateWord {
        const {left, right, operator} = e.node;
        if(operator == "-" && left.type == "Identifier"  && right.type == "Identifier" && right.start == left.end! + 1 )
            return new DelegateWord(left.name + "-" + right.name);
        else 
            return new DelegateBinary(e);
    }
    
    SequenceExpression(e: Path<SequenceExpression>): DelegateGroup {
        return new DelegateGroup(e.get("expressions"));
    }

    CallExpression(e: Path<CallExpression>): DelegateCall {
        return new DelegateCall(e);
    }

    ArrowFunctionExpression(e: Path<ArrowFunctionExpression>): never {
        throw Error.ArrowNotImplemented(e) 
    }
}

export default Arguments;

export type DelegateAbstraction 
    = DelegateBinary
    | DelegateWord
    | DelegateNumeric
    | DelegateColor
    | DelegateGroup
    | DelegateCall
    | DelegateExpression 
    | null;

export class DelegateBinary {
    type = "binary"
    operator: string;
    left: DelegateAbstraction
    right: DelegateAbstraction 

    constructor(
        public path: Path<BinaryExpression>){
        this.operator = path.node.operator
        this.left = Arguments.Parse(path.get("left"))
        this.right = Arguments.Parse(path.get("right"))
    }
}

export class DelegateWord {
    type = "string"

    constructor(
        public value: string, 
        public kind: "string" | "identifier" | "color" = "string" ){
    }
}

export class DelegateNumeric {
    type = "number";

    constructor(
        public value: number ){
    }
}

export class DelegateColor {
    type = "color";

    constructor(
        public value: string ){
    }
}

export class DelegateGroup  {
    type = "group";
    inner: DelegateAbstraction[]

    constructor(
        paths: Path<Expression>[] ){
        
        this.inner = paths.map(Arguments.Parse)
    }
}

export class DelegateCall {
    type = "call";
    name: string
    callee: Path<Identifier>
    inner: DelegateAbstraction[]

    constructor(
        path: Path<CallExpression>){

        const callee = path.get("callee");
        const args = [] as Path<Expression>[];
        
        for(const item of path.get("arguments")){
            if(item.isExpression())
                args.push(item);
            else if(item.isSpreadElement())
                throw Error.ArgumentSpread(item) 
            else 
                throw Error.UnknownArgument(item) 
        }

        if(!callee.isIdentifier())
            throw Error.MustBeIdentifier(callee) 

        this.name = callee.node.name;
        this.callee = callee;
        this.inner = args.map(Arguments.Parse)
    }
}

export class DelegateExpression {
    type = "expression";

    constructor(
        public path: Path<Expression>, 
        public kind: "verbatim" | "expression" | "template" | "spread" ){
    }

    get value(){
        return this.path.node;
    }
}

export class DelegateRequires {
    type = "require"

    constructor(
        public module: string ){  
    }

    get value(){
        return t.callExpression(
            t.identifier("require"), 
            [
                t.stringLiteral(this.module)
            ]
        )
    }
}