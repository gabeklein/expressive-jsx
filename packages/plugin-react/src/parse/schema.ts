import { isIdentifier } from '@babel/types';
import { ParseErrors } from 'errors';
import { ComponentFor, ComponentForX, ComponentIf, DefineElement, Prop } from 'handle';
import { applyModifier } from 'modifier';
import { addElementFromJSX } from 'parse';

import { parse } from './helper';

import type { NodePath as Path } from '@babel/traverse';
import type { LabeledStatement, Statement , IfStatement} from '@babel/types';
import type { Element, ElementInline } from 'handle/element';
import type { ComponentConsequent} from 'handle/switch';
import type { ParserFor } from './helper';

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

export const ParseContent: ParserFor<Element> = {
  LabeledStatement(path){
    const body = path.get('body');
    const { name } = path.node.label;

    if(name[0] == "_")
      throw Oops.BadModifierName(path);

    if(body.isExpressionStatement())
      applyModifier(name, this, body);

    else if(body.isBlockStatement() || body.isLabeledStatement())
      this.use(
        new DefineElement(this.context, name, body)
      );

    else
      throw Oops.BadInputModifier(body, body.type)
  },

  AssignmentExpression({ node }){
    if(node.operator !== "=")
      throw Oops.AssignmentNotEquals(node)

    const { left, right } = node;

    if(!isIdentifier(left))
      throw Oops.PropNotIdentifier(left)

    this.add(new Prop(left.name, right));
  },

  JSXElement({ node }){
    addElementFromJSX(node, this);
  },

  IfStatement(path: Path<IfStatement>){
    const item = new ComponentIf(path, this.context);

    this.adopt(item);
    item.setup();
  },

  ForStatement(path){
    new ComponentFor(path, this);
  },

  ForInStatement(path){
    new ComponentForX(path, this);
  },

  ForOfStatement(path){
    new ComponentForX(path, this);
  },

  VariableDeclaration({ node }){
    this.statements.push(node);
  },

  DebuggerStatement({ node }){
    this.statements.push(node);
  },

  FunctionDeclaration({ node }){
    this.statements.push(node);
  }
}

export const ParseConsequent: ParserFor<ComponentConsequent> = {
  ...ParseContent,

  LabeledStatement(path: Path<LabeledStatement>){
    parse(
      this.definition,
      ParseContent,
      path as Path<Statement>
    );
  }
};

export const ParseForLoop: ParserFor<ElementInline> = {
  ...ParseContent,

  AssignmentExpression(assign){
    Oops.PropsNotAllowed(assign);
  }
}
