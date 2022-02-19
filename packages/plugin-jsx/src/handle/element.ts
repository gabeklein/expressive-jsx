import { Generator } from 'generate/element';

import { AttributeBody } from './object';

import type * as t from 'syntax/types';

export class ElementInline extends AttributeBody {
  tagName?: string | t.JSXMemberExpression;

  toExpression(){
    const { program } = this.context;
    const output = new Generator(this).info;

    if(this.tagName || this.sequence.length)
      return program.element(output, this.tagName);
    else
      return program.container(output);
  }
}