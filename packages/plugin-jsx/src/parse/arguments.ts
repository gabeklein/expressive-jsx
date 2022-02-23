import { ParseErrors } from 'errors';
import * as s from 'syntax';

import type * as t from 'syntax/types';
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

  parse(element: t.Expression | t.Statement): any[] {
    if(s.is(element, "ExpressionStatement"))
      element = element.expression

    return [].concat(
      s.isExpression(element)
        ? this.Expression(element)
        : this.Extract(element)
    )
  }

  Expression<T extends t.Expression>(
    element: T,
    childKey?: keyof T): any {

    if(childKey)
      element = element[childKey] as unknown as T;

    if(s.isParenthesized(element))
      return element;

    return this.Extract(element)
  }

  Extract(element: t.Expression | t.Statement){
    if(element.type in this)
      return this[element.type](element);

    throw Oops.UnknownArgument(element)
  }

  Identifier(e: t.Identifier){
    return e.name
  }

  StringLiteral(e: t.StringLiteral){
    return e.value
  }

  TemplateLiteral(e: t.TemplateLiteral) {
    const { quasis } = e;
    if(quasis.length > 1)
      return e;
    return e.quasis[0].value;
  }

  UnaryExpression(e: t.UnaryExpression){
    const { argument, operator } = e;

    if(operator == "-"
    && s.is(argument, "NumericLiteral"))
      return this.NumericLiteral(argument, -1);

    if(operator == "!"
    && s.is(argument, "Identifier", { name: "Important" }))
      return "!important";

    throw Oops.UnaryUseless(e)
  }

  BooleanLiteral(bool: t.BooleanLiteral){
    return bool.value
  }

  NumericLiteral(number: t.NumericLiteral, sign = 1){
    const { extra: { rawValue, raw } } = number as any;

    if(s.isParenthesized(number) || !/^0x/.test(raw)){
      if(raw.indexOf(".") > 0)
        return sign == -1 ? "-" + raw : raw;

      return sign * rawValue;
    }
    if(sign == -1)
      throw Oops.HexNoNegative(number, rawValue);

    return HEXColor(raw);
  }

  NullLiteral(){
    return null;
  }

  BinaryExpression(binary: t.BinaryExpression){
    const {left, right, operator} = binary;
    if(operator == "-"
    && s.is(left, "Identifier")
    && s.is(right, "Identifier", { start: left.end! + 1 }))
      return left.name + "-" + right.name
    else
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
    const args = [] as t.Expression[];

    for(const item of e.arguments){
      if(s.isExpression(item))
        args.push(item);
      else if(s.is(item, "SpreadElement"))
        throw Oops.ArgumentSpread(item)
      else
        throw Oops.UnknownArgument(item)
    }

    if(callee.type !== "Identifier")
      throw Oops.MustBeIdentifier(callee)

    const call = args.map(x => this.Expression(x)) as CallAbstraction;

    call.callee = callee.name;

    return call;
  }

  ArrowFunctionExpression(e: t.ArrowFunctionExpression): never {
    throw Oops.ArrowNotImplemented(e)
  }

  IfStatement(statement: t.IfStatement){
    const alt = statement.alternate;
    const test = statement.test;
    const body = statement.consequent;

    const data: IfAbstraction = {
      test: this.Expression(test)
    };

    if(alt)
      throw Oops.ElseNotSupported(test);

    if(s.is(body, ["BlockStatement", "LabeledStatement", "ExpressionStatement"]))
      Object.assign(data, this.Extract(body))

    return data;
  }

  LabeledStatement(statement: t.LabeledStatement){
    return {
      [statement.label.name]: this.parse(statement.body)
    }
  }

  BlockStatement(statement: t.BlockStatement){
    const map = {} as BunchOf<any>

    for(const item of statement.body)
      if(s.is(item, "LabeledStatement"))
        map[item.label.name] = this.parse(item.body);
      else if(item.type !== "IfStatement")
        throw Oops.ModiferCantParse(statement);

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
        parseInt(raw.slice(i * 2, i * 2 + 2), 16)
      );

    //decimal for opacity, also prevents repeating digits (i.e. 1/3)
    decimal[3] = (decimal[3] / 255).toFixed(3)

    return `rgba(${ decimal.join(",") })`
  }

  return "#" + raw;
}