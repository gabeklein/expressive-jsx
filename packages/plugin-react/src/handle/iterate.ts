import { arrowFunctionExpression, blockStatement, expressionStatement, forStatement } from '@babel/types';
import { generateElement } from 'generate';
import { ElementInline } from 'handle';
import { ParseForLoop, parser } from 'parse';
import { _call } from 'syntax';

import type { NodePath as Path } from '@babel/traverse';
import type { ForStatement, Statement } from '@babel/types';

export class ComponentFor extends ElementInline {
  parse = parser(ParseForLoop);
  name = "forLoop";

  node: ForStatement;

  constructor(
    public path: Path<ForStatement>,
    element: ElementInline){

    super(element.context);

    this.node = path.node;
    this.handleBody(path, "body");

    element.adopt(this);
  }

  toExpression(){
    const { init, test, update } = this.node;
    
    const scope = this.context.Imports;
    const output = scope.container(generateElement(this));
    const accumulator = scope.ensureUIDIdentifier("add");
    const collect = scope.ensure("$runtime", "collect");
    let body: Statement = expressionStatement(
      _call(accumulator, output)
    );

    if(this.statements.length)
      body = blockStatement([ ...this.statements, body ]);

    return _call(collect, 
      arrowFunctionExpression(
        [accumulator], blockStatement([
          forStatement(init, test, update, body)
        ])
      )  
    )
  }
}