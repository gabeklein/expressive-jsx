import { Generator } from 'generate/element';

import { AttributeBody } from './object';

import type * as t from 'syntax/types';

export class ElementInline extends AttributeBody {
  tagName?: string | t.JSXMemberExpression;

  toExpression(){
    const { program } = this.context;
    const { info } = new Generator(this);

    if(this.tagName || this.sequence.length)
      return program.element(info, this.tagName);
    else
      return program.container(info);
  }
}