import { ParseErrors } from './errors';
import * as t from './types';

const Oops = ParseErrors({
  UnaryUseless: "Unary operator here doesn't do anything",
  HexNoNegative: "Hexadecimal numbers are converted into colors (#FFF) so negative sign doesn't mean anything here.\nParenthesize the number if you really need \"-{1}\" for some reason...",
  ArrowNotImplemented: "Arrow Function not supported yet",
  ArgumentSpread: "Cannot parse argument spreads for modifier handlers",
  UnknownArgument: "Unknown argument while parsing for modifier.",
  MustBeIdentifier: "Only Identifers allowed here! Call expression must reference another modifier.",
  ModiferCantParse: "Illegal value in modifier",
  ElseNotSupported: "An else statement in an if modifier is not yet supported"
});

export class Parser {
  expression: t.Expression;

  constructor(node: t.Expression | t.ExpressionStatement){
    this.expression = t.isExpressionStatement(node)
      ? node.expression : node;
  }

  get arguments(){
    return [].concat(this.Expression(this.expression));
  }

  Expression<T extends t.Expression>(
    element: T,
    childKey?: keyof T): any {
  
    if(childKey)
      element = element[childKey] as unknown as T;

    if(t.isParenthesized(element))
      return element;

    if(element.type in this)
      return (this as any)[element.type](element);
  
    throw Oops.UnknownArgument(element);
  }
  
  Identifier({ name }: t.Identifier){
    if(name.startsWith("$")){
      name = camelToDash(name.slice(1));
      return `var(--${name})`;
    }
  
    return name;
  }
  
  BooleanLiteral(bool: t.BooleanLiteral){
    return bool.value;
  }
  
  StringLiteral(e: t.StringLiteral){
    return e.value;
  }
  
  NullLiteral(){
    return null;
  }
  
  TemplateLiteral(temp: t.TemplateLiteral) {
    if(temp.quasis.length == 1)
      return temp.quasis[0].value.raw;
  
    return temp;
  }
  
  NumericLiteral(number: t.NumericLiteral, negative?: boolean){
    let { extra: { rawValue, raw } } = number as any;
  
    if(t.isParenthesized(number) || !/^0x/.test(raw)){
      if(raw.indexOf(".") > 0)
        return negative ? "-" + raw : raw;
  
      return negative ? -rawValue : rawValue;
    }
  
    if(negative)
      throw Oops.HexNoNegative(number, rawValue);
  
    return HEXColor(raw);
  }
  
  UnaryExpression(e: t.UnaryExpression){
    const { argument, operator } = e;
  
    if(operator == "-" && t.isNumericLiteral(argument))
      return this.NumericLiteral(argument, true);
  
    if(operator == "!" && t.isIdentifier(argument, { name: "important" }))
      return "!important";
  
    throw Oops.UnaryUseless(e)
  }
  
  BinaryExpression(binary: t.BinaryExpression){
    const { left, right, operator } = binary;
  
    if(operator == "-"
    && t.isIdentifier(left)
    && t.isIdentifier(right, { start: left.end! + 1 }))
      return left.name + "-" + right.name
  
    return [
      operator,
      this.Expression(binary, "left"),
      this.Expression(binary, "right")
    ]
  }
  
  SequenceExpression(sequence: t.SequenceExpression){
    return sequence.expressions.map(x => this.Expression(x))
  }

  CallExpression(e: t.CallExpression){
    const callee = e.callee;
    const args = [] as string[];
  
    if(callee.type !== "Identifier")
      throw Oops.MustBeIdentifier(callee);
  
    for(const item of e.arguments){
      if(t.isExpression(item))
        args.push(this.Expression(item));
      else if(t.isSpreadElement(item))
        throw Oops.ArgumentSpread(item)
      else
        throw Oops.UnknownArgument(item)
    }
  
    const { name } = callee;
  
    if(CSS_UNITS.has(name))
      return args.map(x => String(x) + name).join(" ");
  
    return camelToDash(callee.name) + `(${args.join(", ")})`;
  }

  ArrowFunctionExpression(e: t.ArrowFunctionExpression): never {
    throw Oops.ArrowNotImplemented(e);
  }
}

const CSS_UNITS = new Set([
  "ch",
  "cm",
  "em",
  "ex",
  "in",
  "mm",
  "pc",
  "pt",
  "px",
  "rem",
  "vh",
  "vmax",
  "vmin",
  "vw",
])

function HEXColor(raw: string){
  raw = raw.substring(2);

  if(raw.length == 1)
    raw = "000" + raw
  else if(raw.length == 2)
    raw = "000000" + raw

  if(raw.length % 4 == 0){
    let decimal = [] as any[];

    if(raw.length == 4)
      // Convert shorthand: 'ABC' => 'AABBCC' => 0xAABBCC
      decimal = Array.from(raw).map(x => parseInt(x+x, 16))

    else for(let i = 0; i < 4; i++)
      decimal.push(
        parseInt(raw.slice(i * 2, i * 2 + 2), 16)
      );

    //decimal for opacity, also prevents repeating digits (i.e. 1/3)
    decimal[3] = (decimal[3] / 255).toFixed(3)

    return `rgba(${ decimal.join(",") })`
  }

  return "#" + raw;
}

function camelToDash(x: string){
  return x.replace(/([A-Z]+)/g, "-$1").toLowerCase();
}