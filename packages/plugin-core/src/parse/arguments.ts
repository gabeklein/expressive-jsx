import {
    ArrowFunctionExpression,
    BinaryExpression,
    BooleanLiteral,
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
import { ParseErrors } from 'shared';
import { NodePath as Path } from '@babel/traverse';

const Error = ParseErrors({
    StatementAsArgument: "Cannot parse statement as a modifier argument!",
    UnaryUseless: "Unary operator here doesn't do anything",
    HexNoNegative: "Hexadecimal numbers are converted into colors (#FFF) so negative sign doesn't mean anything here.\nParenthesize the number if you really need \"-{1}\" for some reason...",
    ArrowNotImplemented: "Arrow Function not supported yet",
    ArgumentSpread: "Cannot parse argument spreads for modifier handlers",
    UnknownArgument: "Unknown argument while parsing for modifier.",
    MustBeIdentifier: "Only Identifers allowed here! Call expression must reference another modifier.",
    TemplateMustBeText: "Template can only contain text here"
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

        if(Opts.env == "native")
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

export default new class DelegateTypes {

    [type: string]: (...args: any[]) => any;

    Parse(
        element: Path<Expression> | Path<Statement>, 
        get?: string): any[] {

        const args = element.isSequenceExpression()
        ? element.get("expressions") : [ element ];

        return args.map(x => this.Extract(x))
    }

    Extract(
        element: Path<Expression> | Path<Statement>, 
        get?: string): any {

        if(get)
            element = element.get(get) as typeof element;

        if(element.isStatement()){
            if(element.isExpressionStatement())
                element = element.get("expression");
            else 
                throw Error.StatementAsArgument(element) 
        }
    
        const { type } = element;
    
        if(!this[type])
            throw Error.UnknownArgument(element)
        else
            return this[type](element);
    }

    Identifier(e: Path<Identifier>){
        return e.node.name
    }

    StringLiteral(e: Path<StringLiteral>){
        return e.node.value
    }

    TemplateLiteral(e: Path<TemplateLiteral>) {
        const { quasis } = e.node;
        if(quasis.length > 1)
            throw Error.TemplateMustBeText(e);
        return e.node.quasis[0].value;
    }

    UnaryExpression(e: Path<UnaryExpression>){
        const arg = e.get("argument");
        if(e.node.operator == "-" && arg.isNumericLiteral())
            return this.NumericLiteral(arg, -1)
        // else if(e.node.operator == "!")
        //     return new DelegateExpression(arg, "verbatim");
        else throw Error.UnaryUseless(e) 
    }

    BooleanLiteral(bool: Path<BooleanLiteral>){
        return bool.node.value
    }

    NumericLiteral(number: Path<NumericLiteral>, sign = 1){
        const { extra: { rawValue, raw } } = number.node as any;
        if(inParenthesis(number) || !/^0x/.test(raw))
            return sign*rawValue;
        else {
            if(sign == -1)
                throw Error.HexNoNegative(number, rawValue) 
            return HEXColor(raw);
        }
    }

    NullLiteral(_e: Path<NullLiteral>){
        return null;
    }

    BinaryExpression(e: Path<BinaryExpression>){
        const {left, right, operator} = e.node;
        if(operator == "-" 
        && left.type == "Identifier"  
        && right.type == "Identifier" 
        && right.start == left.end! + 1)
            return left.name + "-" + right.name
        else 
            return [operator, this.Extract(e, "left"), this.Extract(e, "right")]
    }
    
    SequenceExpression(sequence: Path<SequenceExpression>){
        return sequence.get("expressions").map(x => this.Extract(x))
    }

    CallExpression(e: Path<CallExpression>){
        const callee = e.get("callee");
        const args = [] as Path<Expression>[];
        
        for(const item of e.get("arguments")){
            if(item.isExpression())
                args.push(item);
            else if(item.isSpreadElement())
                throw Error.ArgumentSpread(item) 
            else 
                throw Error.UnknownArgument(item) 
        }

        if(!callee.isIdentifier())
            throw Error.MustBeIdentifier(callee) 
            
        return [callee, ...args].map(x => this.Extract(x))
    }

    ArrowFunctionExpression(e: Path<ArrowFunctionExpression>): never {
        throw Error.ArrowNotImplemented(e) 
    }
}