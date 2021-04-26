import { generateElement } from 'generate';

import { AttributeBody } from './object';

import type { Define } from 'handle/definition';
import type { JSXMemberExpression } from 'syntax';

export class ElementInline extends AttributeBody {
  explicitTagName?: string | JSXMemberExpression;

  toExpression(){
    const { name } = this;
    const tagName = this.explicitTagName || (
      name && /^[A-Z]/.test(name) ? name : undefined
    )

    const info = generateElement(this);

    return this.context.program.element(info, tagName);
  }

  use(mod: Define){
    for(const use of [mod, ...mod.includes]){
      this.includes.add(use);
      use.targets.add(this);
    }
  }
}