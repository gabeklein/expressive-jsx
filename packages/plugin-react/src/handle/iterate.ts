import { arrowFunctionExpression, blockStatement, expressionStatement } from '@babel/types';
import { generateElement } from 'generate';
import { ElementInline } from 'handle';
import { ParseForLoop, parser } from 'parse';
import { _call } from 'syntax';

import type { NodePath as Path } from '@babel/traverse';
import type { Statement, For } from '@babel/types';
import type { ForPath } from 'types';

export class ComponentFor extends ElementInline {
  statements = [] as Statement[];
  parse = parser(ParseForLoop);
  name = "forLoop";

  node: For;

  constructor(
    public path: ForPath,
    element: ElementInline){

    super(element.context);

    this.node = path.node;
    this.handleBody(
      path.get("body") as Path<Statement>
    );

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