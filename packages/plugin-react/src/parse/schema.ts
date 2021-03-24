import { identifier, isDoExpression, isIdentifier } from '@babel/types';
import { ParseErrors } from 'errors';
import {
  ComponentExpression,
  ComponentFor,
  ComponentForX,
  ComponentIf,
  DefineElement,
  Prop,
} from 'handle';
import { applyModifier } from 'modifier';
import { addElementFromJSX } from 'parse';
import { meta } from 'shared';

import { parse } from './helper';

import type { NodePath as Path } from '@babel/traverse';
import type { LabeledStatement, Statement , IfStatement} from '@babel/types';
import type { ElementInline } from 'handle/element';
import type { AttributeBody } from 'handle/object';
import type { ComponentConsequent} from 'handle/switch';
import type { ParserFor } from './helper';

const Oops = ParseErrors({
  ReturnElseNotImplemented: "This is an else condition, returning from here is not implemented.",
  IfStatementCannotContinue: "Previous consequent already returned, cannot integrate another clause.",
  CantReturnInNestedIf: "Cant return because this if-statement is nested!",
  CanOnlyReturnTopLevel: "Cant return here because immediate parent is not the component.",
  CanOnlyReturnFromLeadingIf: "Cant return here because it's not the first if consequent in-chain.",
  AssignmentNotEquals: "Only `=` assignment may be used here.",
  BadInputModifier: "Modifier input of type {1} not supported here!",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  ExpressionUnknown: "Unhandled expressionary statement of type {1}",
  NodeUnknown: "Unhandled node of type {1}",
  PropNotIdentifier: "Assignment must be identifier name of a prop.",
  PropsNotAllowed: "For block cannot accept prop assignments"
})

export { parser } from './helper'

export const ParseAttributes: ParserFor<AttributeBody> = {
  LabeledStatement(path){
    const body = path.get('body');
    const { name } = path.node.label;
    const { context } = this;

    if(name[0] == "_")
      throw Oops.BadModifierName(path);

    if(body.isExpressionStatement())
      applyModifier(name, this, body);

    else if(body.isBlockStatement() || body.isLabeledStatement())
      this.use(
        new DefineElement(context, name, body)
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

    const { name } = left;
    let prop: Prop;

    if(isDoExpression(right))
      prop = 
        meta(right).expressive_parent =
        new Prop(name, identifier("undefined"));
    else
      prop =
        new Prop(name, right)

    this.add(prop);
  }
}

export const ParseContent: ParserFor<ElementInline> = {
  ...ParseAttributes,

  JSXElement({ node }){
    addElementFromJSX(node, this);
  },

  IfStatement(path: Path<IfStatement>){
    ComponentIf.insert(path, this);
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
      path as Path<Statement>,
      ParseAttributes,
      this.definition
    );
  },

  ReturnStatement(path){
    const { context } = this;

    if(!this.test)
      throw Oops.ReturnElseNotImplemented(path)

    if(this.index !== 1)
      throw Oops.CanOnlyReturnFromLeadingIf(path)

    if(context.currentIf !== context.parentIf)
      throw Oops.CantReturnInNestedIf(path);

    if(!(context.currentElement instanceof ComponentExpression))
      throw Oops.CanOnlyReturnTopLevel(path);

    const arg = path.get("argument");

    if(arg)
      if(arg.isDoExpression())
        meta(arg.node, this);

      else if(arg.isExpression())
        parse(arg, ParseContent, this);

    this.doesReturn = true;
  }
};

export const ParseForLoop: ParserFor<ComponentFor> = {
  ...ParseContent,

  AssignmentExpression(assign){
    Oops.PropsNotAllowed(assign);
  }
}
