import {
  arrayExpression,
  arrowFunctionExpression,
  blockStatement,
  expressionStatement,
  isArrayPattern,
  isBinaryExpression,
  isForInStatement,
  isForXStatement,
  isIdentifier,
  isObjectPattern,
  isVariableDeclaration,
  returnStatement,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { Prop } from 'handle';
import { _call, _declare, _get, _iife, _objectKeys } from 'syntax';
import { ElementReact } from 'translate';

import type {
  BlockStatement,
  CallExpression,
  Expression,
  Identifier,
  ForXStatement,
  BooleanLiteral,
  ForStatement
} from '@babel/types';
import type { ComponentFor } from 'handle/iterate';

const Oops = ParseErrors({
  BadForOfAssignment: "Assignment of variable left of \"of\" must be Identifier or Destruture",
  BadForInAssignment: "Left of ForInStatement must be an Identifier here!"
})

export class ElementIterate extends ElementReact<ComponentFor> {
  toExpression(): CallExpression | BooleanLiteral {
    const { node } = this.source;

    if(isForXStatement(node))
      return this.toMapExpression(node);
    else
      return this.toInvokedForLoop(node);
  }

  private getReferences(node: ForXStatement){
    let { left, right } = node;
    let key: Identifier;

    if(isVariableDeclaration(left))
      left = left.declarations[0].id;

    if(isIdentifier(left) || isObjectPattern(left) || isArrayPattern(left))
      void 0;
    else
      throw Oops.BadForOfAssignment(left);

    if(isBinaryExpression(right, {operator: "in"})){
      key = right.left as Identifier
      right = right.right;
    }

    if(isForInStatement(node)){
      if(isIdentifier(left))
        key = left
      else 
        throw Oops.BadForInAssignment(left);
    }
    else
      key = this.source.context.Imports.ensureUIDIdentifier("i");

    return { left, right, key }
  }

  private ensureKeyProp(key: Identifier){
    const { children } = this;
    const [ element ] = children;

    if(children.length === 1
    && element instanceof ElementReact
    && element.source.props.key === undefined)
      element.applyProp(new Prop("key", key));

    else if(this.props.length){
      const doesExist =
        this.props.find(x => x.name === "key");

      if(!doesExist)
        this.props.push({ name: "key", value: key! });
    }
  }

  private toMapExpression(node: ForXStatement){
    const { left, right, key } = this.getReferences(node);
    const { Imports } = this.source.context;
    const { statements } = this.source;

    let body: BlockStatement | Expression = 
      Imports.container(this);

    if(statements.length)
      body = blockStatement([
        ...statements,
        returnStatement(body)
      ])

    this.ensureKeyProp(key);

    if(isForInStatement(node))
      return _call(
        _get(_objectKeys(right!), "map"),
        arrowFunctionExpression([left!], body)
      )
    else
      return _call(
        _get(right!, "map"),
        arrowFunctionExpression([left!, key!], body)
      )
  }

  private toInvokedForLoop(node: ForStatement){
    const { Imports } = this.source.context;
    const accumulator = Imports.ensureUIDIdentifier("acc");
    const content = Imports.container(this);

    node.body = blockStatement([
      ...this.source.statements,
      expressionStatement(
        _call(
          _get(accumulator, "push"),
          content
        )
      )
    ])

    return _iife([
      _declare("const", accumulator, arrayExpression()),
      node,
      returnStatement(accumulator)
    ])
  }
}