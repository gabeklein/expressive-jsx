import { ParseErrors } from 'errors';
import { Prop } from 'handle/attributes';
import { DefineVariant } from 'handle/definition';
import { ComponentFor } from 'handle/iterate';
import { ComponentIf } from 'handle/switch';
import * as $ from 'syntax';
import { ensureArray } from 'utility';

import { addElementFromJSX } from './jsx';
import { handleDefine } from './labels';

import type * as t from 'syntax/types';
import type { Define } from 'handle/definition';

const Oops = ParseErrors({
  PropNotIdentifier: "Assignment must be identifier name of a prop."
})

export function parse(
  target: Define,
  block: t.Path<any>,
  key?: string){

  if(key)
    block = block.get(key) as any;

  const body = $.is(block, "BlockStatement")
    ? ensureArray(block.get("body"))
    : [block];

  for(const item of body){
    switch(item.type){
      case "LabeledStatement": 
        handleDefine(target, item);
      break

      case "IfStatement":
        handleIfStatement(target, item);
      break;

      case "ExpressionStatement": {
        const expr = item.get("expression") as t.Path<t.Expression>;

        if($.is(expr, "JSXElement"))
          addElementFromJSX(target, expr);
        else if($.is(expr, "AssignmentExpression", { operator: "=" }))
          handlePropAssignment(target, expr);
        else
          continue;
      }
      break;

      case "ForInStatement":
      case "ForOfStatement":
      case "ForStatement":
        new ComponentFor(item, target);
      break;

      default:
        continue;
    }

    item.remove();
  }
}

function handlePropAssignment(
  target: Define, expr: t.Path<t.AssignmentExpression>){

  const { left, right } = expr.node;

  if(!$.is(left, "Identifier"))
    throw Oops.PropNotIdentifier(left)

  const prop = new Prop(left.name, right);

  target.add(prop);
}

function handleIfStatement(
  target: Define, path: t.Path<t.IfStatement>){

  const test = path.node.test;

  if($.is(test, "StringLiteral")){
    const body = path.get("consequent") as any;
    const mod = new DefineVariant(target, [ test.value ], 5);

    parse(mod, body);
    target.use(mod);
  }
  else {
    const item = new ComponentIf();

    item.setup(target.context, path);
    target.adopt(item);
  }
}