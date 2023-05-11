import { ParseErrors } from 'errors';
import * as $ from 'syntax';

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

function toDashCase(text: string){
  return text.replace(/([A-Z]+)/g, "-$1").toLowerCase();
}

const types: any = {
  Identifier,
  StringLiteral,
  TemplateLiteral,
  UnaryExpression,
  BooleanLiteral,
  NumericLiteral,
  NullLiteral,
  BinaryExpression,
  SequenceExpression,
  CallExpression,
  ArrowFunctionExpression,
  IfStatement,
  LabeledStatement,
  BlockStatement
}

export function parse(element: t.Expression | t.Statement): any[] {
  if($.is(element, "ExpressionStatement"))
    element = element.expression;

  return [].concat(
    $.isExpression(element)
      ? Expression(element)
      : Extract(element)
  )
}

function Expression<T extends t.Expression>(
  element: T,
  childKey?: keyof T): any {

  if(childKey)
    element = element[childKey] as unknown as T;

  if($.isParenthesized(element))
    return element;

  return Extract(element)
}

function Extract(element: t.Expression | t.Statement){
  if(element.type in types)
    return types[element.type](element);

  throw Oops.UnknownArgument(element)
}

function Identifier({ name }: t.Identifier){
  if(name.startsWith("$")){
    name = toDashCase(name.slice(1));

    return `var(--${name})`;
  }

  return name;
}

function StringLiteral(e: t.StringLiteral){
  return e.value;
}

function TemplateLiteral(e: t.TemplateLiteral) {
  const { quasis } = e;

  return quasis.length == 1
    ? e.quasis[0].value.raw
    : e;
}

function UnaryExpression(e: t.UnaryExpression){
  const { argument, operator } = e;

  if(operator == "-"
  && $.is(argument, "NumericLiteral"))
    return NumericLiteral(argument, -1);

  if(operator == "!"
  && $.is(argument, "Identifier", { name: "Important" }))
    return "!important";

  throw Oops.UnaryUseless(e)
}

function BooleanLiteral(bool: t.BooleanLiteral){
  return bool.value
}

function NumericLiteral(number: t.NumericLiteral, sign = 1){
  const { extra: { rawValue, raw } } = number as any;

  if($.isParenthesized(number) || !/^0x/.test(raw)){
    if(raw.indexOf(".") > 0)
      return sign == -1 ? "-" + raw : raw;

    return sign * rawValue;
  }
  if(sign == -1)
    throw Oops.HexNoNegative(number, rawValue);

  return HEXColor(raw);
}

function NullLiteral(){
  return null;
}

function BinaryExpression(binary: t.BinaryExpression){
  const {left, right, operator} = binary;
  if(operator == "-"
  && $.is(left, "Identifier")
  && $.is(right, "Identifier", { start: left.end! + 1 }))
    return left.name + "-" + right.name
  else
    return [
      operator,
      Expression(binary, "left"),
      Expression(binary, "right")
    ]
}

function SequenceExpression(sequence: t.SequenceExpression){
  return sequence.expressions.map(x => Expression(x))
}

function CallExpression(e: t.CallExpression){
  const callee = e.callee;
  const args = [] as string[];

  for(const item of e.arguments){
    if($.isExpression(item))
      args.push(Expression(item));
    else if($.is(item, "SpreadElement"))
      throw Oops.ArgumentSpread(item)
    else
      throw Oops.UnknownArgument(item)
  }

  if(callee.type !== "Identifier")
    throw Oops.MustBeIdentifier(callee);

  return toDashCase(callee.name) + `(${args.join(", ")})`;
}

function ArrowFunctionExpression(e: t.ArrowFunctionExpression): never {
  throw Oops.ArrowNotImplemented(e)
}

function IfStatement(statement: t.IfStatement){
  const alt = statement.alternate;
  const test = statement.test;
  const body = statement.consequent;

  if(alt)
    throw Oops.ElseNotSupported(test);

  const info =
    body.type == "BlockStatement" ? BlockStatement(body) :
    body.type == "LabeledStatement" ? LabeledStatement(body) :
    body.type == "ExpressionStatement" ? Expression(body.expression) : {};

  return {
    test: Expression(test),
    ...info
  }
}

function LabeledStatement(stat: t.LabeledStatement){
  return {
    [stat.label.name]: parse(stat.body)
  }
}

function BlockStatement(statement: t.BlockStatement){
  const map = {} as BunchOf<any>

  for(const item of statement.body)
    if($.is(item, "LabeledStatement"))
      map[item.label.name] = parse(item.body);
    else if(item.type !== "IfStatement")
      throw Oops.ModiferCantParse(statement);

  return map;
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