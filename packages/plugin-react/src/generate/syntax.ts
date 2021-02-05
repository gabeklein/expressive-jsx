import {
  arrayExpression,
  booleanLiteral,
  callExpression,
  Expression,
  identifier,
  LVal,
  MemberExpression,
  memberExpression,
  nullLiteral,
  numericLiteral,
  objectExpression,
  objectProperty,
  stringLiteral,
  thisExpression,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';

import { ExplicitStyle, Prop } from 'handle';
import { BunchOf } from 'types';

export function propertyES(
  name: string,
  value: Expression){

  return objectProperty(
    stringLiteral(name),
    value
  )
}

export function attributeES(
  src: Prop | ExplicitStyle){

  return objectProperty(
    stringLiteral(src.name as string),
    expressionValue(src)
  )
}

export function expressionValue(
  item: Prop | ExplicitStyle){

  let { value } = item;

  switch(typeof value){
    case "string":
      return stringLiteral(value);
    case "number":
      return numericLiteral(value);
    case "boolean":
      return booleanLiteral(value);
    case "object":
      if(value === null)
        return nullLiteral();
      else
        return value;
    default:
      return identifier("undefined");
  }
}

export function ensureArray(
  children: Expression,
  getFirst?: boolean){

  const array = callExpression(
    memberExpression(
      arrayExpression(),
      stringLiteral("concat")
    ),
    [ children ]
  )

  if(getFirst)
    return memberExpression(array, numericLiteral(0));
  else
    return array;
}

export function _objectExpression(obj: BunchOf<Expression | false | undefined> = {}){
  const properties = [];
  for(const x in obj){
    if(obj[x])
    properties.push(
      objectProperty(
        identifier(x),
        obj[x] as Expression
      )
    )
  }
  return objectExpression(properties);
}

export function _memberExpression(
  object: string | Expression,
  ...path: (string | number)[] ){

  if(object == "this")
    object = thisExpression()

  if(typeof object == "string")
    path = [...object.split("."), ...path]

  for(let member of path){
    let select;

    if(typeof member == "string"){
      select = /^[A-Za-z0-9$_]+$/.test(member)
        ? identifier(member)
        : stringLiteral(member);
    }
    else if(typeof member == "number")
      select = numericLiteral(member);
    else
      throw new Error("Bad member id, only strings and numbers are allowed")

    object = typeof object == "object"
      ? memberExpression(object, select, select!.type !== "Identifier")
      : select;
  }

  return object as MemberExpression;
}

export function _callExpression(
  callee: Expression,
  ...args: Expression[]
){
  return callExpression(callee, args)
}

export function requireExpression(from: string){
  const argument = 
    typeof from == "string"
      ? stringLiteral(from)
      : from

  return callExpression(
    identifier("require"), [argument]
  )
}

export function _declareStatement(
  type: "const" | "let" | "var",
  id: LVal,
  init?: Expression ){

  return (
    variableDeclaration(type, [
      variableDeclarator(id, init)
    ])
  )
}