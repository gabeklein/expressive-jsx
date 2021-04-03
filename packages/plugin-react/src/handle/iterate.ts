import { arrowFunctionExpression, blockStatement, expressionStatement, forStatement } from '@babel/types';
import { ElementInline } from 'handle';
import { parse, ParseForLoop } from 'parse';
import { _call } from 'syntax';

import type { NodePath as Path } from '@babel/traverse';
import type { ForStatement, Statement } from '@babel/types';
import type { StackFrame } from 'context';
import type { Element } from './element';

export class ComponentFor {
  context!: StackFrame;
  definition: ElementInline;

  constructor(
    private path: Path<ForStatement>,
    parent: Element){

    const element = new ElementInline(parent.context);
    parse(element, ParseForLoop, path, "body");

    this.definition = element;

    parent.context.push(this);
    parent.adopt(this);
  }

  toExpression(){
    const { init, test, update } = this.path.node;
    const { statements } = this.definition;

    const output = this.definition.toExpression(true);
    const scope = this.context.Imports;
    const accumulator = scope.ensureUIDIdentifier("add");
    const collect = scope.ensure("$runtime", "collect");

    let body: Statement =
      expressionStatement(
        _call(accumulator, output)
      );

    if(statements.length)
      body = blockStatement([ ...statements, body ]);

    return _call(collect, 
      arrowFunctionExpression(
        [accumulator], blockStatement([
          forStatement(init, test, update, body)
        ])
      )  
    )
  }
}