import { parse } from 'parse/body';

import { DefineElement } from './definition';

import type {
  ForStatement,
  ForInStatement,
  ForOfStatement,
  ForXStatement,
  Path
} from 'syntax';
import type { StackFrame } from 'context';
import { forElement, forXElement } from 'generate/iterate';

export class ComponentFor {
  context!: StackFrame;
  definition: DefineElement;
  node: ForStatement;

  constructor(
    path: Path<ForStatement>,
    parent: DefineElement){

    const element = new DefineElement(parent.context, "forLoop");

    parse(element, path, "body");

    this.definition = element;
    this.node = path.node;

    parent.context.push(this);
    parent.adopt(this);
  }

  toExpression(){
    return forElement(this.node, this.definition);
  }
}

export class ComponentForX {
  context!: StackFrame;
  definition: DefineElement;
  node: ForXStatement

  constructor(
    path: Path<ForInStatement> | Path<ForOfStatement>,
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
    return forXElement(this.node, this.definition);
  }
}