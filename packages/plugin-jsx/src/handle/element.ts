import { Generator } from 'generate/element';

import { AttributeBody } from './object';

import type * as t from 'syntax/types';
import type { Define } from 'handle/definition';

export class ElementInline extends AttributeBody {
  tagName?: string | t.JSXMemberExpression;

  toExpression(){
    const { program } = this.context;
    const { info: output } = new Generator(this);

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