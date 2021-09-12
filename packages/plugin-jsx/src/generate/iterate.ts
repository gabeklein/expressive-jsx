import { ParseErrors } from 'errors';
import { Prop } from 'handle/attributes';
import { ElementInline } from 'handle/element';
import * as t from 'syntax';

import type { DefineElement } from 'handle/definition';

const Oops = ParseErrors({
  BadForOfAssignment: "Assignment of variable left of \"of\" must be Identifier or Destruture",
  BadForInAssignment: "Left of ForInStatement must be an Identifier here!",
});

export function forElement(
  node: t.ForStatement,
  define: DefineElement){

  const { statements } = define;
  const { program } = define.context;

  const output = define.toExpression();

  if(!output)
    return;

  const accumulator = program.ensureUIDIdentifier("add");
  const collect = program.ensure("$runtime", "collect");

  let body: t.Statement =
    t.expressionStatement(
      t.call(accumulator, output)
    );

  if(statements.length)
    body = t.blockStatement([ ...statements, body ]);

  node.body = body;

  return t.call(collect, 
    t.arrowFunctionExpression(
      [accumulator], t.blockStatement([ node ])
    )  
  )
}

export function forXElement(
  node: t.ForXStatement,
  define: DefineElement){

  let { left, right, key } = getReferences(node);

  key = ensureKeyProp(define, key);

  let body: t.Expression | t.BlockStatement | undefined = 
    define.toExpression();

  if(!body)
    return;

  if(define.statements.length)
    body = t.blockStatement([
      ...define.statements,
      t.returnStatement(body)
    ])
  
  if(node.type == "ForOfStatement"){
    const params = key ? [left, key] : [left];

    return t.call(
      t.get(right, "map"),
      t.arrowFunctionExpression(params, body)
    )
  }
  else
    return t.call(
      t.get(t.objectKeys(right), "map"),
      t.arrowFunctionExpression([left], body)
    )
}

function getReferences(node: t.ForXStatement){
  let { left, right } = node;
  let key: t.Identifier | undefined;

  if(left.type == "VariableDeclaration")
    left = left.declarations[0].id;

  switch(left.type){
    case "Identifier":
    case "ObjectPattern":
    case "ArrayPattern":
      break;

    default:
      throw Oops.BadForOfAssignment(left);
  }

  if(right.type == "BinaryExpression" && right.operator == "in"){
    key = right.left as t.Identifier;
    right = right.right;
  }

  if(node.type == "ForInStatement")
    if(left.type == "Identifier")
      key = left;
    else
      throw Oops.BadForInAssignment(left);

  return { left, right, key }
}

function ensureKeyProp(
  from: DefineElement,
  used?: t.Identifier){

  let { sequence, children } = from;

  const props = sequence.filter(x => x instanceof Prop) as Prop[];

  for(const x of props)
    if(x.name === "key")
      return;

  if(children.length == 1 && props.length == 0){
    const element = children[0];

    if(element instanceof ElementInline){
      for(const x of element.sequence)
        if(x instanceof Prop && x.name === "key")
          return;
      
      sequence = element.sequence;
    }
  }

  if(!used)
    used = from.context.program.ensureUIDIdentifier("i");

  sequence.push(new Prop("key", used));

  return used;
}