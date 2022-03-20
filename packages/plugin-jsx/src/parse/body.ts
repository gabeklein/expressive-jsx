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

export function parseFunctionBody(
  block: t.Path<t.BlockStatement>, target: Define){

  const body = block.get("body") as t.Path<any>[];

  for(const item of body){
    switch(item.type){
      case "LabeledStatement": 
        handleDefine(target, item, true);
      break

      case "IfStatement":
        handleIfStatement(target, item);
      break;

      case "ExpressionStatement": {
        const exp = item.get("expression") as t.Path<t.Expression>;

        if($.is(exp, "JSXElement"))
          continue;
        else
          handleExpression(target, exp);
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

export function parse(
  target: Define, ast: t.Path<any>, key?: string){

  if(key)
    ast = ast.get(key) as any;

  const content = $.is(ast, "BlockStatement")
    ? ensureArray(ast.get("body"))
    : [ast];
  
  for(const item of content)
    switch(item.type){
      case "LabeledStatement": 
        handleDefine(target, item);
      break

      case "IfStatement":
        handleIfStatement(target, item);
      break;

      case "ExpressionStatement": {
        const exp = item.get("expression") as t.Path<t.Expression>;

        if($.is(exp, "JSXElement"))
          addElementFromJSX(exp, target);
        else
          handleExpression(target, exp);
      }
      break;

      case "ForInStatement":
      case "ForOfStatement":
      case "ForStatement":
        new ComponentFor(item, target);
      break;

      default:
        target.statements.push(item.node);
    }
}

function handleExpression(
  target: Define, path: t.Path<t.Expression>){

  if($.is(path, "AssignmentExpression", { operator: "=" })){
    const { left, right } = path.node;

    if(!$.is(left, "Identifier"))
      throw Oops.PropNotIdentifier(left)

    const prop = new Prop(left.name, right);
      
    target.add(prop);
  }
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