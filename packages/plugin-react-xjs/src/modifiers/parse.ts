import {
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
import { HEXColor, inParenthesis } from '../internal';
import { Path } from '../internal/types';

const Arguments = new class DelegateTypes {

    [type: string]: (...args: any[]) => DelegateAbstraction;

    Parse(element: Path<Expression> | Path<Statement>): DelegateAbstraction {

        if(element.isStatement()){
            if(element.isExpressionStatement())
                element = element.get("expression");
            else 
                throw element.buildCodeFrameError("Cannot parse statement as a modifier argument!");
        }
    
        const Handler = Arguments[element.type];
    
        if(inParenthesis(element) || !Handler)
            return new DelegatePassThru(element, "expression");
        else
            return Handler(element);
    }

    Identifier(e: Path<Identifier>){
        return new DelegateWord(e.node.name, "identifier");
    }

    StringLiteral(e: Path<StringLiteral>){
        return new DelegateWord(e.node.value, "string");
    }

    TemplateLiteral(e: Path<TemplateLiteral>): DelegatePassThru {
        return new DelegatePassThru(e, "template");
    }

    UnaryExpression(e: Path<UnaryExpression>){
        const arg = e.get("argument");
        if(e.node.operator == "-" && arg.isNumericLiteral())
            return this.NumericLiteral(arg, -1)
        else if(e.node.operator == "!")
            return new DelegatePassThru(arg, "verbatim");
        else throw e.buildCodeFrameError("Unary operator here doesn't do anything")
    }

    NumericLiteral(number: Path<NumericLiteral>, sign = 1): DelegateNumeric | DelegateColor {
        const { raw, rawValue } = number.node as any;
        if(inParenthesis(number) || !/^0x/.test(raw))
            return new DelegateNumeric(sign*rawValue);
        else {
            if(sign == -1)
                throw number.buildCodeFrameError(`Hexadecimal numbers are converted into colors (#FFF) so negative sign doesn't mean anything here.\nParenthesize the number if you really need "-${rawValue}" for some reason...`)
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
        throw e.buildCodeFrameError("Arrow Function not supported yet")
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
    | DelegatePassThru 
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
                throw item.buildCodeFrameError("Cannot parse argument spreads for modifier handlers");
            else 
                throw item.buildCodeFrameError("Unknown argument while parsing for modifier.")
        }

        if(!callee.isIdentifier())
            throw callee.buildCodeFrameError("Only the identifier of another modifier may be called within another modifier.")

        this.name = callee.node.name;
        this.callee = callee;
        this.inner = args.map(Arguments.Parse)
    }
}

export class DelegatePassThru {
    type = "expression";

    constructor(
        public path: Path<Expression>, 
        public kind: "verbatim" | "expression" | "template" | "spread" ){
    }
}

export class DelegateRequires {
    type = "require"

    constructor(
        public module: string ){  
    }
}