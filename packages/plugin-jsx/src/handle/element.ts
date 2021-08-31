import { generateElement } from 'generate/element';

import { AttributeBody } from './object';

import type { Define } from 'handle/definition';
import type { JSXMemberExpression } from 'syntax';

export class ElementInline extends AttributeBody {
  tagName?: string | JSXMemberExpression;

  toExpression(){
    const { program } = this.context;
    const output = generateElement(this);

    if(this.tagName || this.sequence.length)
      return program.element(output, this.tagName);
    else
      return program.container(output);
  }

  use(mod: Define){
    for(const use of [mod, ...mod.includes]){
      this.includes.add(use);
      use.targets.add(this);
    }
  }
}