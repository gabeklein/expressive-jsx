import { isIdentifier } from '@babel/types';
import { ParseErrors } from 'errors';
import { ComponentFor, ComponentForX, ComponentIf, DefineElement, Prop } from 'handle';
import { applyModifier } from 'modifier';
import { addElementFromJSX, parse } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
import type { Statement } from '@babel/types';
import type { Element } from 'handle/element';
import type { ComponentConsequent } from 'handle/switch';

const Oops = ParseErrors({
  IfStatementCannotContinue: "Previous consequent already returned, cannot integrate another clause.",
  AssignmentNotEquals: "Only `=` assignment may be used here.",
  BadInputModifier: "Modifier input of type {1} not supported here!",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  ExpressionUnknown: "Unhandled expressionary statement of type {1}",
  NodeUnknown: "Unhandled node of type {1}",
  PropNotIdentifier: "Assignment must be identifier name of a prop.",
  PropsNotAllowed: "For block cannot accept prop assignments"
})

export { parse } from './helper'

export function ParseContent(
  target: Element, path: Path<any>){

  switch(path.type){
    case "LabeledStatement": {
      const body = path.get('body') as Path<Statement>;
      const { name } = path.node.label;
  
      if(name[0] == "_")
        throw Oops.BadModifierName(path);
  
      if(body.isExpressionStatement())
        applyModifier(name, target, body);
  
      else if(body.isBlockStatement() || body.isLabeledStatement()){
        const mod = new DefineElement(target.context, name);
        parse(mod, ParseContent, body);
        target.use(mod);
      }

      else
        throw Oops.BadInputModifier(body, body.type)

      break;
    }

    case "AssignmentExpression": {
      const { node } = path;

      if(node.operator !== "=")
        throw Oops.AssignmentNotEquals(node)
  
      const { left, right } = node;
  
      if(!isIdentifier(left))
        throw Oops.PropNotIdentifier(left)
  
      target.add(new Prop(left.name, right));

      break;
    }

    case "IfStatement": {
      const item = new ComponentIf(path, target.context);

      target.adopt(item);
      item.setup();

      break;
    }

    case "JSXElement":
      addElementFromJSX(path, target);
      break;

    case "ForStatement":
      new ComponentFor(path, target);
      break;

    case "ForInStatement":
    case "ForOfStatement":
      new ComponentForX(path, target);
      break;

    case "VariableDeclaration":
    case "DebuggerStatement":
    case "FunctionDeclaration":
      target.statements.push(path.node);
      break;

    default:
      return false;
  }

  return true;
}

export function ParseConsequent(
  target: ComponentConsequent,
  path: Path<any>){

  if(path.isLabeledStatement())
    return ParseContent(target.definition, path);
  else
    return ParseContent(target, path);
}

export function ParseForLoop(
  target: Element, path: Path<any>){

  if(path.isAssignmentExpression())
    throw Oops.PropsNotAllowed(path);
  else
    return ParseContent(target, path);
}