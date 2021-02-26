import {
  arrayExpression,
  blockStatement,
  doExpression,
  expressionStatement,
  isBlockStatement,
  returnStatement,
} from '@babel/types';
import { ParseForLoop, parser } from 'parse';
import { generateElement } from 'generate';
import { meta } from 'shared';
import { _call, _declare, _get, _iife } from 'syntax';

import { ComponentContainer } from './';

import type { ElementInline } from 'handle';
import type { Statement, For } from '@babel/types';
import type { ForPath } from 'types';

export class ComponentFor extends ComponentContainer {
  parse = parser(ParseForLoop);
  name = "forLoop";

  node: For

  constructor(
    public path: ForPath,
    element: ElementInline){

    super(element.context);

    this.node = path.node;
    this.doBlock = this.handleContentBody(path.node.body);

    element.adopt(this);

    if(this.doBlock)
      path.replaceWith(this.doBlock);
  }

  toExpression(){
    const { node } = this;
    const { Imports } = this.context;
    const accumulator = Imports.ensureUIDIdentifier("acc");
    const content = Imports.container(generateElement(this));

    node.body = blockStatement([
      ...this.statements,
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

  handleContentBody(content: Statement){
    if(!isBlockStatement(content))
      content = blockStatement([content])

    const body = doExpression(content);
    meta(body, this);

    return body;
  }
}