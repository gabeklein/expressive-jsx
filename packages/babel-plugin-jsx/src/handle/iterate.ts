import { forElement, forXElement } from 'generate/iterate';
import { parse } from 'parse/block';

import { Define } from './definition';

import * as t from 'syntax';

export class ComponentFor {
  definition: Define;
  node: t.For;

  constructor(
    path: t.Path<t.For>,
    parent: Define){

    const name = path.type.replace("Statement", "Loop");
    const element = new Define(parent.context, name);

    parse(element, path, "body");

    this.definition = element;
    this.node = path.node;

    parent.adopt(this);
  }

  toExpression(){
    const { node, definition } = this;
    
    return t.isForStatement(node)
      ? forElement(node, definition)
      : forXElement(node, definition)
  }
}