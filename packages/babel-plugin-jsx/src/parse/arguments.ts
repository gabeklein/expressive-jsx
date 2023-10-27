import { ParseErrors } from 'errors';
import { t } from 'syntax';

import type * as $ from 'types';

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

export function parse(element: $.Expression | $.Statement): any[] {
  if(t.isExpressionStatement(element))
    element = element.expression;

  return [].concat(
    t.isExpression(element)
      ? Expression(element)
      : Extract(element)
  )
}

function Expression<T extends $.Expression>(
  element: T,
  childKey?: keyof T): any {

  if(childKey)
    element = element[childKey] as unknown as T;

  if(t.isParenthesized(element))
    return element;

  return Extract(element)
}

function Extract(element: $.Expression | $.Statement){
  if(element.type in types)
    return types[element.type](element);

  throw Oops.UnknownArgument(element)
}

function Identifier({ name }: $.Identifier){
  if(name.startsWith("$")){
    name = toDashCase(name.slice(1));

    return `var(--${name})`;
  }

  return name;
}

function StringLiteral(e: $.StringLiteral){
  return e.value;
}

function TemplateLiteral(e: $.TemplateLiteral) {
  const { quasis } = e;

  return quasis.length == 1
    ? e.quasis[0].value.raw
    : e;
}

function UnaryExpression(e: $.UnaryExpression){
  const { argument, operator } = e;

  if(operator == "-" && t.isNumericLiteral(argument))
    return NumericLiteral(argument, true);

  if(operator == "!" && t.isIdentifier(argument, { name: "important" }))
    return "!important";

  throw Oops.UnaryUseless(e)
}

function BooleanLiteral(bool: $.BooleanLiteral){
  return bool.value;
}

function NumericLiteral(number: $.NumericLiteral, negative?: boolean){
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

function NullLiteral(){
  return null;
}

function BinaryExpression(binary: $.BinaryExpression){
  const {left, right, operator} = binary;
  if(operator == "-"
  && t.isIdentifier(left)
  && t.isIdentifier(right, { start: left.end! + 1 }))
    return left.name + "-" + right.name
  else
    return [
      operator,
      Expression(binary, "left"),
      Expression(binary, "right")
    ]
}

function SequenceExpression(sequence: $.SequenceExpression){
  return sequence.expressions.map(x => Expression(x))
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

function CallExpression(e: $.CallExpression){
  const callee = e.callee;
  const args = [] as string[];

  if(callee.type !== "Identifier")
    throw Oops.MustBeIdentifier(callee);

  for(const item of e.arguments){
    if(t.isExpression(item))
      args.push(Expression(item));
    else if(t.isSpreadElement(item))
      throw Oops.ArgumentSpread(item)
    else
      throw Oops.UnknownArgument(item)
  }

  const { name } = callee;

  if(CSS_UNITS.has(name))
    return args.map(x => String(x) + name).join(" ");

  return toDashCase(callee.name) + `(${args.join(", ")})`;
}

function ArrowFunctionExpression(e: $.ArrowFunctionExpression): never {
  throw Oops.ArrowNotImplemented(e);
}

function IfStatement(statement: $.IfStatement){
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

function LabeledStatement(stat: $.LabeledStatement){
  return {
    [stat.label.name]: parse(stat.body)
  }
}

function BlockStatement(statement: $.BlockStatement){
  const map = {} as Record<string, any>

  for(const item of statement.body)
    if(t.isLabeledStatement(item))
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