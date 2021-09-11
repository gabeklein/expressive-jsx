import { forElement, forXElement } from 'generate/iterate';
import { parse } from 'parse/body';
import * as t from 'syntax';

import { DefineElement } from './definition';


export class ComponentFor {
  definition: DefineElement;
  node: t.For;

  constructor(
    path: t.Path<t.For>,
    parent: DefineElement){

    const name = path.type.replace("Statement", "Loop");
    const element = new DefineElement(parent.context, name);

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