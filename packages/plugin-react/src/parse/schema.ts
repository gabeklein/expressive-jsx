import * as t from '@babel/types';
import { ParseErrors } from 'errors';
import { ComponentFor, ComponentForX, ComponentIf, Prop } from 'handle';
import { addElementFromJSX } from 'parse';
import { parseDefineBlock } from "./labels";

import type { NodePath as Path } from '@babel/traverse';
import type { Define } from 'handle';

const Oops = ParseErrors({
  IfStatementCannotContinue: "Previous consequent already returned, cannot integrate another clause.",
  AssignmentNotEquals: "Only `=` assignment may be used here.",
  ExpressionUnknown: "Unhandled expressionary statement of type {1}",
  NodeUnknown: "Unhandled node of type {1}",
  PropNotIdentifier: "Assignment must be identifier name of a prop."
})

export function ParseContent(
  target: Define, path: Path<any>){

  switch(path.type){
    case "AssignmentExpression": {
      const { node } = path;

      if(node.operator !== "=")
        throw Oops.AssignmentNotEquals(node)
  
      const { left, right } = node;
  
      if(!t.isIdentifier(left))
        throw Oops.PropNotIdentifier(left)
  
      target.add(new Prop(left.name, right));

      break;
    }

    case "LabeledStatement": {
      parseDefineBlock(target, path);
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