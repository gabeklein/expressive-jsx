import { forElement, forXElement } from 'generate/iterate';
import { parse } from 'parse/block';
import * as t from 'syntax';

import { Define } from './definition';

import type * as $ from 'types';

export class ComponentFor {
  definition: Define;
  node: $.For;

  constructor(
    path: $.Path<$.For>,
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