import { is, node } from './nodes';

import type * as t from './types';
import type { BunchOf, FlatValue } from 'types';

const IdentifierType = /(Expression|Literal|Identifier|JSXElement|JSXFragment|Import|Super|MetaProperty|TSTypeAssertion)$/;

export function isExpression(node: any): node is t.Expression {
  return typeof node == "object" && IdentifierType.test(node.type);
}

export function expression(value?: FlatValue | t.Expression){
  try {
    return literal(value as any);
  }
  catch(err){
    return value as t.Expression;
  }
}

export function literal(value: string): t.StringLiteral;
export function literal(value: number): t.NumericLiteral;
export function literal(value: boolean): t.BooleanLiteral;
export function literal(value: null): t.NullLiteral;
export function literal(value: undefined): t.Identifier;
export function literal(value: string | number | boolean | null | undefined){
  switch(typeof value){
    case "string":
      return node("StringLiteral", { value });
    case "number":
      return node("NumericLiteral", { value });
    case "boolean":
      return node("BooleanLiteral", { value });
    case "undefined":
      return identifier("undefined");
    case "object":
      if(value === null)
        return node("NullLiteral", {});
    default:
      throw new Error("Not a literal type");
  }
}

export function identifier(name: string): t.Identifier {
  return node("Identifier", {
    name,
    decorators: null,
    typeAnnotation: null,
    optional: false
  });
}

export function keyIdentifier(name: string){
  return /^[A-Za-z0-9$_]+$/.test(name)
    ? identifier(name)
    : node("StringLiteral", { value: name })
}

export function property(
  key: string | t.StringLiteral | t.Identifier,
  value: t.Expression){

  let shorthand = false;

  if(typeof key == "string"){
    shorthand = is(value, "Identifier", { name: key })
    key = keyIdentifier(key);
  }

  return node("ObjectProperty", { 
    key, value, shorthand,
    computed: false,
    decorators: []
  });
}

export function spread(argument: t.Expression){
  return node("SpreadElement", { argument });
}

export function pattern(
  properties: (t.RestElement | t.ObjectProperty)[]){

  return node("ObjectPattern", {
    properties, decorators: [], typeAnnotation: null
  });
}

export function object(
  obj: (t.ObjectProperty | t.SpreadElement)[] | BunchOf<t.Expression | false | undefined> = {}){

  let properties = [];

  if(Array.isArray(obj))
    properties = obj;
  else
    for(const [key, value] of Object.entries(obj))
      if(value)
        properties.push(property(key, value))

  return node("ObjectExpression", { properties });
}

export function get(object: "this"): t.ThisExpression;
export function get<T extends t.Expression> (object: T): T;
export function get(object: string | t.Expression, ...path: (string | number | t.Expression)[]): t.MemberExpression;
export function get(object: string | t.Expression, ...path: (string | number | t.Expression)[]){
  if(object == "this")
    object = node("ThisExpression")

  if(typeof object == "string")
    path = [...object.split("."), ...path]

  for(const x of path){
    let select;

    if(isExpression(x))
      select = x;    
    else if(typeof x == "number")
      select = literal(x);
    else if(typeof x == "string")
      select = keyIdentifier(x);
    else
      throw new Error("Bad member id, only strings and numbers are allowed")

    object = typeof object == "object"
      ? member(object, select)
      : select;
  }

  return object as t.Expression;
}

export function member(object: t.Expression, property: t.Expression){
  return node("MemberExpression", {
    object,
    property,
    optional: false,
    computed: !is(property, "Identifier")
  })
}

export function call(
  callee: t.Expression | string, ...args: t.Expression[]){

  if(typeof callee == "string")
    callee = get(callee);

  return node("CallExpression", {
    callee,
    arguments: args,
    optional: false,
    typeArguments: null,
    typeParameters: null
  })
}

export function requires(from: string){
  return call("require", literal(from))
}

export function returns(argument: t.Expression){
  return node("ReturnStatement", { argument });
}

export function declare(
  kind: "const" | "let" | "var",
  id: t.LVal,
  init?: t.Expression ){

  return node("VariableDeclaration", {
    kind,
    declare: false,
    declarations: [
      node("VariableDeclarator", {
        id, init: init || null, definite: null
      })
    ]
  })
}

export function objectAssign(...objects: t.Expression[]){
  return call("Object.assign", ...objects)
}

export function objectKeys(object: t.Expression){
  return call("Object.keys", object)
}

export function template(text: string){
  return node("TemplateLiteral", {
    expressions: [],
    quasis: [
      node("TemplateElement", {
        value: { raw: text, cooked: text },
        tail: false
      })
    ]
  })
}

export function statement(from: t.Statement | t.Expression){
  if(isExpression(from))
    return node("ExpressionStatement", { expression: from });
  else
    return from;
}

export function block(
  ...statements: (t.Statement | t.Expression)[]): t.BlockStatement {

  const stats = statements.map(statement);
  
  return node("BlockStatement", {
    body: stats, directives: []
  });
}

export function arrow(
  params: (t.Identifier | t.Pattern | t.RestElement | t.TSParameterProperty)[],
  body: t.BlockStatement | t.Expression,
  async = false){

  return node("ArrowFunctionExpression", {
    async,
    body,
    typeParameters: null,
    generator: false,
    params,
    returnType: null,
    expression: isExpression(body)
  });
}

export function importDeclaration(
  specifiers: Array<t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier>,
  source: t.StringLiteral){

  return node("ImportDeclaration", {
    specifiers, source, importKind: null
  })
}

export function importSpecifier(
  local: t.Identifier, imported: t.Identifier){

  return node("ImportSpecifier", {
    local, imported, importKind: null
  })
}

export function importDefaultSpecifier(local: t.Identifier){
  return node("ImportDefaultSpecifier", { local })
}