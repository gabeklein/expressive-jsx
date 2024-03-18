import {
  BlockStatement,
  BooleanLiteral,
  Expression,
  Identifier,
  LVal,
  MemberExpression,
  NullLiteral,
  NumericLiteral,
  ObjectProperty,
  SpreadElement,
  Statement,
  StringLiteral,
  ThisExpression,
} from '@babel/types';

import { t } from '.';

export type FlatValue = string | number | boolean | null;

export function literal(value: string): StringLiteral;
export function literal(value: number): NumericLiteral;
export function literal(value: boolean): BooleanLiteral;
export function literal(value: null): NullLiteral;
export function literal(value: undefined): Identifier;
export function literal(value: string | number | boolean | null | undefined){
  switch(typeof value){
    case "string":
      return t.stringLiteral(value);
    case "number":
      return t.numericLiteral(value);
    case "boolean":
      return t.booleanLiteral(value);
    case "undefined":
      return t.identifier("undefined");
    case "object":
      if(value === null)
        return t.nullLiteral();
    default:
      throw new Error("Not a literal type");
  }
}

export function keyIdentifier(name: string){
  return /^[A-Za-z0-9$_]+$/.test(name)
    ? t.identifier(name)
    : t.stringLiteral(name);
}

export function property(
  key: string | StringLiteral | Identifier,
  value: Expression){

  let shorthand = false;

  if(typeof key == "string"){
    shorthand = t.isIdentifier(value, { name: key });
    key = keyIdentifier(key);
  }

  return t.objectProperty(key, value, false, shorthand);
}

export function object(
  obj: (ObjectProperty | SpreadElement)[] | Record<string, Expression | false | undefined> = {}){

  let properties = [];

  if(Array.isArray(obj))
    properties = obj;
  else
    for(const [key, value] of Object.entries(obj))
      if(value)
        properties.push(property(key, value))

  return t.objectExpression(properties);
}

export function get(object: "this"): ThisExpression;
export function get<T extends Expression> (object: T): T;
export function get(object: string | Expression, ...path: (string | number | Expression)[]): MemberExpression;
export function get(object: string | Expression, ...path: (string | number | Expression)[]){
  if(object == "this")
    object = t.thisExpression();

  if(typeof object == "string")
    path = [...object.split("."), ...path]

  for(const x of path){
    let select;

    if(typeof x == "number")
      select = literal(x);
    else if(typeof x == "string")
      select = keyIdentifier(x);
    else if(t.isExpression(x))
      select = x;    
    else 
      throw new Error("Bad member id, only strings and numbers are allowed")

    object = typeof object == "object"
      ? member(object, select)
      : select;
  }

  return object as Expression;
}

export function member(object: Expression, property: Expression){
  return t.memberExpression(object, property, !t.isIdentifier(property));
}

export function call(
  callee: Expression | string, ...args: Expression[]){

  if(typeof callee == "string")
    callee = get(callee);

  return t.callExpression(callee, args);
}

export function requires(from: string){
  return call("require", literal(from))
}

export function returns(argument: Expression, parenthesized = false){
  const statement = t.returnStatement(argument);
  statement.extra = { parenthesized };
  return statement;
}

export function declare(
  kind: "const" | "let" | "var",
  id: LVal,
  init?: Expression ){

  return t.variableDeclaration(kind, [
    t.variableDeclarator(id, init || null)
  ]);
}

export function objectAssign(...objects: Expression[]){
  return call("Object.assign", ...objects)
}

export function objectKeys(object: Expression){
  return call("Object.keys", object)
}

export function templateExpression(text: string){
  return t.templateLiteral([
    t.templateElement({ raw: text, cooked: text }, false)
  ], []);
}

export function statement(from: Statement | Expression){
  return t.isExpression(from) ? t.expressionStatement(from) : from;
}

export function block(
  ...statements: (Statement | Expression)[]): BlockStatement {

  const stats = statements.map(statement);

  return t.blockStatement(stats);
}