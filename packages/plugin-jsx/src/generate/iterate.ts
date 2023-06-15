import { ParseErrors } from 'errors';
import { Prop } from 'handle/attributes';
import { ElementInline } from 'handle/definition';
import * as $ from 'syntax';

import type * as t from 'syntax/types';
import type { Define } from 'handle/definition';

const Oops = ParseErrors({
  BadForOfAssignment: "Assignment of variable left of \"of\" must be Identifier or Destruture",
  BadForInAssignment: "Left of ForInStatement must be an Identifier here!",
});

export function forElement(
  node: t.ForStatement,
  define: Define){

  const { statements } = define;
  const { program } = define.context;

  const output = define.toExpression();

  if(!output)
    return;

  const accumulator = program.ensureUIDIdentifier("add");
  const collect = program.ensure("$runtime", "collect");

  let body: t.Statement | t.Expression =
    $.statement(
      $.call(accumulator, output)
    );

  if(statements.length)
    body = $.block(...statements, body);

  node.body = body;

  return $.call(collect, 
    $.arrow([accumulator], $.block(node))  
  )
}

export function forXElement(
  node: t.ForXStatement,
  define: Define){

  let { left, right, key } = getReferences(node);

  key = ensureKeyProp(define, key);

  let body: t.Expression | t.BlockStatement | undefined = 
    define.toExpression();

  if(!body)
    return;

  if(define.statements.length)
    body = $.block(...define.statements, $.returns(body));
  
  if($.is(node, "ForOfStatement")){
    const params = key ? [left, key] : [left];

    return $.call(
      $.get(right, "map"),
      $.arrow(params, body)
    )
  }

  return $.call(
    $.get($.objectKeys(right), "map"),
    $.arrow([left], body)
  )
}

function getReferences(node: t.ForXStatement){
  let { left, right } = node;
  let key: t.Identifier | undefined;

  if($.is(left, "VariableDeclaration"))
    left = left.declarations[0].id;

  switch(left.type){
    case "Identifier":
    case "ObjectPattern":
    case "ArrayPattern":
      break;

    default:
      throw Oops.BadForOfAssignment(left);
  }

  if($.is(right, "BinaryExpression", { operator: "in" })){
    key = right.left as t.Identifier;
    right = right.right;
  }

  if($.is(node, "ForInStatement"))
    if($.is(left, "Identifier"))
      key = left;
    else
      throw Oops.BadForInAssignment(left);

  return { left, right, key }
}

function ensureKeyProp(
  from: Define,
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