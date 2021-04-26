import { parse } from 'parse/body';
import * as t from 'syntax';

import { DefineElement } from './definition';

import type {
  For,
  ForStatement,
  ForInStatement,
  ForOfStatement,
  Path
} from 'syntax';
import type { StackFrame } from 'context';
import { forElement, forXElement } from 'generate/iterate';

export class ComponentFor {
  context!: StackFrame;
  definition: DefineElement;
  node: For;

  constructor(
    path: Path<ForStatement> | Path<ForInStatement> | Path<ForOfStatement>,
    parent: DefineElement){

    const name = path.type.replace("Statement", "Loop");
    const element = new DefineElement(parent.context, name);

    parse(element, path, "body");

    this.definition = element;
    this.node = path.node;

    parent.context.push(this);
    parent.adopt(this);
  }

  toExpression(){
    const { node, definition } = this;
    
    return t.isForStatement(node)
      ? forElement(node, definition)
      : forXElement(node, definition)
  }
}