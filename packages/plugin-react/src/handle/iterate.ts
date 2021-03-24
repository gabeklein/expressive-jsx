import { arrowFunctionExpression, blockStatement, expressionStatement } from '@babel/types';
import { generateElement } from 'generate';
import { ElementInline } from 'handle';
import { ParseForLoop, parser } from 'parse';
import { _call } from 'syntax';

import type { For } from '@babel/types';
import type { ForPath } from 'types';

export class ComponentFor extends ElementInline {
  parse = parser(ParseForLoop);
  name = "forLoop";

  node: For;

  constructor(
    public path: ForPath,
    element: ElementInline){

    super(element.context);

    this.node = path.node;
    this.handleBody(path, "body");

    element.adopt(this);
  }

  toExpression(){
    const { node, statements } = this;
    const { Imports } = this.context;
    const accumulator = Imports.ensureUIDIdentifier("add");
    const content = Imports.container(generateElement(this));
    const collect = Imports.ensure("$runtime", "collect");
    const collector = expressionStatement(
      _call(accumulator, content)
    );

    node.body = statements.length
      ? blockStatement([ ...statements, collector ])
      : node.body = collector;

    return _call(collect, 
      arrowFunctionExpression(
        [accumulator], blockStatement([ node ])
      )  
    )
  }
}