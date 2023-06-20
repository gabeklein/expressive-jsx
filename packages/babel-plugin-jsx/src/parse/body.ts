import { ParseErrors } from 'errors';
import { OUTPUT_NODE } from 'generate/jsx';
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

      case "ForInStatement":
      case "ForOfStatement":
      case "ForStatement":
        new ComponentFor(item, target);
      break;

      case "ExpressionStatement": {
        const expr = item.get("expression") as t.Path<t.Expression>;

        if($.is(expr, "AssignmentExpression", { operator: "=" })){
          handlePropAssignment(target, expr);
          break;
        }

        if($.is(expr, ["JSXElement", "JSXFragment"])){
          OUTPUT_NODE.add(expr.node)
          addElementFromJSX(target, expr as any);
        }
      }

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
    let select = test.value;

    if(/^\w+$/.test(select))
      select = `.${select}`;

    const body = path.get("consequent") as any;
    const mod = new DefineVariant(target, [ select ], 5);

    parse(mod, body);
    target.use(mod);
    return;
  }

  const item = new ComponentIf();

  item.setup(target.context, path as t.Path);
  target.adopt(item);
}