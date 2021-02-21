import {
  blockStatement,
  doExpression,
  isBlockStatement,
  isForXStatement,
  isIdentifier,
  isVariableDeclaration,
} from '@babel/types';
import { ParseForLoop, parser } from 'parse';
import { meta } from 'shared';

import { ComponentContainer } from './';

import type { For, Statement } from '@babel/types';
import type { StackFrame } from 'context';
import type { ElementInline } from 'handle';
import type { ForPath } from 'types';

export class ComponentFor extends ComponentContainer {
  parse = parser(ParseForLoop);
  
  node: For

  static insert(
    path: ForPath,
    element: ElementInline){
    
    const item = new this(path, element.context);

    element.adopt(item);

    if(item.doBlock)
      path.replaceWith(item.doBlock);
  }

  constructor(
    public path: ForPath,
    context: StackFrame){

    super(context);

    this.node = path.node
    this.name = this.generateName();
    this.doBlock = this.handleContentBody(path.node.body);
  }

  handleContentBody(content: Statement){
    if(!isBlockStatement(content))
      content = blockStatement([content])

    const body = doExpression(content);
    meta(body, this);

    return body;
  }

  private generateName(){
    const { node } = this;

    if(isForXStatement(node)){
      let { left } = node;
      const { right } = node;
      const name = [];

      if(isVariableDeclaration(left))
        left = left.declarations[0].id;

      if(isIdentifier(left))
        name.push(left.name);

      name.push(node.type == "ForInStatement" ? "in" : "of");

      if(isIdentifier(right))
        name.push(right.name);

      return name.reduce(
        (acc, w) => acc + w[0].toUpperCase() + w.slice(1),
        "for"
      )
    }
    else
      return "for"
  }
}