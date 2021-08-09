import { generateElement } from 'generate/element';

import { AttributeBody } from './object';

import type { Define } from 'handle/definition';
import type { JSXMemberExpression } from 'syntax';

export class ElementInline extends AttributeBody {
  tagName?: string | JSXMemberExpression;

  toExpression(){
    return this.context.program.element(
      generateElement(this), this.tagName
    );
  }

  use(mod: Define){
    for(const use of [mod, ...mod.includes]){
      this.includes.add(use);
      use.targets.add(this);
    }
  }
}