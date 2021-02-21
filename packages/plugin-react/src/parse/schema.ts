import { identifier, isDoExpression, isIdentifier } from '@babel/types';
import { ParseErrors } from 'errors';
import {
  ComponentExpression,
  ComponentFor,
  ComponentForIn,
  ComponentForOf,
  ComponentIf,
  ElementModifier,
  Prop,
} from 'handle';
import { applyModifier } from 'modifier';
import { addElementFromJSX } from 'parse';
import { meta } from 'shared';

import { parse } from './helper';

import type { NodePath as Path } from '@babel/traverse';
import type { LabeledStatement, Statement , IfStatement} from '@babel/types';
import type { AttributeBody} from 'handle/attributes';
import type { ElementInline, ComponentContainer } from 'handle/element';
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
  DuplicateModifier: "Duplicate declaration of named modifier!",
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
      throw Oops.BadModifierName(path)

    if(context.modifiers.has(name))
      throw Oops.DuplicateModifier(path);

    if(body.isExpressionStatement())
      applyModifier(name, this, body);

    else if(body.isBlockStatement() || body.isLabeledStatement())
      this.applyModifier(
        new ElementModifier(context, name, body)
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

    this.insert(prop);
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

  ForInStatement(path){
    ComponentForIn.insert(path, this);
  },

  ForOfStatement(path){
    ComponentForOf.insert(path, this);
  },

  ForStatement(path){
    ComponentFor.insert(path, this);
  }
}

export const ParseContainer: ParserFor<ComponentContainer> = {
  ...ParseContent,

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

  ReturnStatement(path){
    const arg = path.get("argument");
    const { context } = this;

    if(!this.test)
      throw Oops.ReturnElseNotImplemented(path)

    if(this.index !== 1)
      throw Oops.CanOnlyReturnFromLeadingIf(path)

    if(context.currentIf !== context.parentIf)
      throw Oops.CantReturnInNestedIf(path);

    if(!(context.currentElement instanceof ComponentExpression))
      throw Oops.CanOnlyReturnTopLevel(path);

    if(arg)
      if(arg.isDoExpression())
        meta(arg.node, this);

      else if(arg.isExpression())
        parse(arg, ParseContent, this);

    this.doesReturn = true;
  },

  LabeledStatement(path: Path<LabeledStatement>){
    const mod = this.slaveModifier || this.slaveNewModifier();
    parse(path as Path<Statement>, ParseAttributes, mod);
  }
};

export const ParseForLoop: ParserFor<ComponentFor> = {
  ...ParseContainer,

  AssignmentExpression(assign){
    Oops.PropsNotAllowed(assign);
  }
}
