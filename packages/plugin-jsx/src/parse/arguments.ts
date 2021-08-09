import { ParseErrors } from 'errors';
import * as t from 'syntax';

import type {
  ArrowFunctionExpression,
  BinaryExpression,
  BlockStatement,
  BooleanLiteral,
  CallExpression,
  Expression,
  Identifier,
  IfStatement,
  LabeledStatement,
  NumericLiteral,
  SequenceExpression,
  Statement,
  StringLiteral,
  TemplateLiteral,
  UnaryExpression
} from 'syntax';
import type { BunchOf } from 'types';

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

interface CallAbstraction extends Array<any> {
  callee: string;
}

interface IfAbstraction {
  [type: string]: (...args: any[]) => any;
  test: any;
}

export class DelegateTypes {
  [type: string]: (...args: any[]) => any;

  parse(element: Expression | Statement): any[] {
    if(t.isExpressionStatement(element))
      element = element.expression

    return [].concat(
      t.isExpression(element)
        ? this.Expression(element)
        : this.Extract(element)
    )
  }

  Expression<T extends Expression>(
    element: T,
    childKey?: keyof T): any {

    if(childKey)
      element = element[childKey] as unknown as T;

    if(inParenthesis(element))
      return element;

    return this.Extract(element)
  }

  Extract(element: Expression | Statement){
    if(element.type in this)
      return this[element.type](element);
    else
      throw Oops.UnknownArgument(element)
  }

  Identifier(e: Identifier){
    return e.name
  }

  StringLiteral(e: StringLiteral){
    return e.value
  }

  TemplateLiteral(e: TemplateLiteral) {
    const { quasis } = e;
    if(quasis.length > 1)
      return e;
    return e.quasis[0].value;
  }

  UnaryExpression(e: UnaryExpression){
    const arg = e.argument;
    if(e.operator == "-" && t.isNumericLiteral(arg))
      return this.NumericLiteral(arg, -1)
    if(e.operator == "!" && t.isIdentifier(arg) && arg.name == "important")
      return "!important";
    // else if(e.operator == "!")
    //     return new DelegateExpression(arg, "verbatim");
    else throw Oops.UnaryUseless(e)
  }

  BooleanLiteral(bool: BooleanLiteral){
    return bool.value
  }

  NumericLiteral(number: NumericLiteral, sign = 1){
    const { extra: { rawValue, raw } } = number as any;
    if(inParenthesis(number) || !/^0x/.test(raw)){
      if(raw.indexOf(".") > 0)
        return sign == -1 ? "-" + raw : raw;
      return sign*rawValue;
    }
    else {
      if(sign == -1)
        throw Oops.HexNoNegative(number, rawValue)
      return HEXColor(raw);
    }
  }

  NullLiteral(){
    return null;
  }

  BinaryExpression(binary: BinaryExpression){
    const {left, right, operator} = binary;
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

  SequenceExpression(sequence: SequenceExpression){
    return sequence.expressions.map(x => this.Expression(x))
  }

  CallExpression(e: CallExpression){
    const callee = e.callee;
    const args = [] as Expression[];

    for(const item of e.arguments){
      if(t.isExpression(item))
        args.push(item);
      else if(t.isSpreadElement(item))
        throw Oops.ArgumentSpread(item)
      else
        throw Oops.UnknownArgument(item)
    }

    if(!t.isIdentifier(callee))
      throw Oops.MustBeIdentifier(callee)

    const call = args.map(x => this.Expression(x)) as CallAbstraction;
    call.callee = callee.name;

    return call;
  }

  ArrowFunctionExpression(e: ArrowFunctionExpression): never {
    throw Oops.ArrowNotImplemented(e)
  }

  IfStatement(statement: IfStatement){
    const alt = statement.alternate;
    const test = statement.test;
    const body = statement.consequent;

    const data: IfAbstraction = {
      test: this.Expression(test)
    };

    if(alt)
      throw Oops.ElseNotSupported(test);

    if(t.isBlockStatement(body)
    || t.isLabeledStatement(body)
    || t.isExpressionStatement(body)) {
      Object.assign(data, this.Extract(body))
    }

    return data;
  }

  LabeledStatement(statement: LabeledStatement){
    return {
      [statement.label.name]: this.parse(statement.body)
    }
  }

  BlockStatement(statement: BlockStatement){
    const map = {} as BunchOf<any>

    for(const item of statement.body){
      if(!t.isLabeledStatement(item))
        throw Oops.ModiferCantParse(statement);

      map[item.label.name] = this.parse(item.body)
    }

    return map;
  }
}

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
        parseInt(raw.slice(i*2, i*2+2), 16)
      );

    //decimal for opacity, also prevents repeating digits (i.e. 1/3)
    decimal[3] = (decimal[3] / 255).toFixed(3)

    return `rgba(${ decimal.join(",") })`
  }
  else return "#" + raw;
}

function inParenthesis(node: Expression){
  const { extra } = node as any;
  return extra ? extra.parenthesized === true : false;
}