import { NodePath as Path } from '@babel/traverse';
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
    LabeledStatement,
    BlockStatement,
    IfStatement,
} from '@babel/types';
import { inParenthesis, Opts, ParseErrors } from 'shared';
import { BunchOf, CallAbstraction , IfAbstraction } from 'types'

const Error = ParseErrors({
    StatementAsArgument: "Cannot parse statement as a modifier argument!",
    UnaryUseless: "Unary operator here doesn't do anything",
    HexNoNegative: "Hexadecimal numbers are converted into colors (#FFF) so negative sign doesn't mean anything here.\nParenthesize the number if you really need \"-{1}\" for some reason...",
    ArrowNotImplemented: "Arrow Function not supported yet",
    ArgumentSpread: "Cannot parse argument spreads for modifier handlers",
    UnknownArgument: "Unknown argument while parsing for modifier.",
    MustBeIdentifier: "Only Identifers allowed here! Call expression must reference another modifier.",
    TemplateMustBeText: "Template can only contain text here",
    ModiferCantParse: "Illegal value in modifier",
    ElseNotSupported: "An else statement in an if modifier is not yet supported"
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

export const Arguments = new class DelegateTypes {

    [type: string]: (...args: any[]) => any;

    Parse(
        element: Path<Expression> | Path<Statement>, 
        get?: string): any[] {

        if(element.isExpressionStatement())
            element = element.get("expression")

        return [].concat(
            element.isExpression()
                ? this.Expression(element)
                : this.Extract(element)
        )
    }

    Extract(
        element: Path<Expression | Statement>
    ){
        if(element.type in this)
            return this[element.type](element);
        else 
            throw Error.UnknownArgument(element)
    }

    Expression(
        element: Path<Expression>, 
        childKey?: string): any {

        if(childKey)
            element = element.get(childKey) as typeof element;
    
        const { node } = element as any;

        if(node.extra && node.extra.parenthesized)
            return node;

        return this.Extract(element)
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
            return e.node;
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
        if(inParenthesis(number) || !/^0x/.test(raw)){
            if(raw.indexOf(".") > 0)
                return sign == -1 ? "-" + raw : raw;
            return sign*rawValue;
        }
        else {
            if(sign == -1)
                throw Error.HexNoNegative(number, rawValue) 
            return HEXColor(raw);
        }
    }

    NullLiteral(_e: Path<NullLiteral>){
        return null;
    }

    BinaryExpression(binary: Path<BinaryExpression>){
        const {left, right, operator} = binary.node;
        if(operator == "-" 
        && left.type == "Identifier"  
        && right.type == "Identifier" 
        && right.start == left.end! + 1)
            return left.name + "-" + right.name
        else 
            return [
                operator, 
                this.Expression(binary, "left"), 
                this.Expression(binary, "right")
            ]
    }
    
    SequenceExpression(sequence: Path<SequenceExpression>){
        return sequence
            .get("expressions")
            .map(x => this.Expression(x))
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

        const call = args.map(x => this.Expression(x)) as CallAbstraction;
        call.callee = callee.node.name;
            
        return call;
    }

    ArrowFunctionExpression(e: Path<ArrowFunctionExpression>): never {
        throw Error.ArrowNotImplemented(e) 
    }

    IfStatement(
        statement: Path<IfStatement>
    ){
        const alt = statement.get("alternate");
        const test = statement.get("test");
        const body = statement.get("body");

        const data = {
            test: this.Expression(test)
        } as IfAbstraction

        if(alt)
            throw Error.ElseNotSupported(test);

        if(Array.isArray(body))
            throw "?"

        if(body.isBlockStatement()
        || body.isLabeledStatement()){
            Object.assign(data, this.Extract(body))
        }

        return data; 
    }

    LabeledStatement(
        statement: Path<LabeledStatement>
    ){
        return {
            [statement.node.label.name]: this.Parse(statement.get("body"))
        }
    }

    BlockStatement(
        statement: Path<BlockStatement>
    ){
        const map = {} as BunchOf<any>

        for(const item of statement.get("body")){
            if(!item.isLabeledStatement())
                throw Error.ModiferCantParse(statement);
            
            map[item.node.label.name] = this.Parse(item.get("body"))
        }

        return map;
    }
}