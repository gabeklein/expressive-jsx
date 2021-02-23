import {
  blockStatement,
  doExpression,
  isBlockStatement
} from '@babel/types';
import { ParseForLoop, parser } from 'parse';
import { meta } from 'shared';

import { ComponentContainer } from './';

import type { Statement, For } from '@babel/types';
import type { ElementInline } from 'handle';
import type { ForPath } from 'types';

export class ComponentFor extends ComponentContainer {
  parse = parser(ParseForLoop);
  name = "forLoop";

  node: For

  constructor(
    public path: ForPath,
    element: ElementInline){

    super(element.context);

    this.node = path.node;
    this.doBlock = this.handleContentBody(path.node.body);

    element.adopt(this);

    if(this.doBlock)
      path.replaceWith(this.doBlock);
  }

  handleContentBody(content: Statement){
    if(!isBlockStatement(content))
      content = blockStatement([content])

    const body = doExpression(content);
    meta(body, this);

    return body;
  }
}

export class ComponentForOf extends ComponentFor {
  name = "forOfLoop";

}

export class ComponentForIn extends ComponentFor {
  name = "forInLoop";

}