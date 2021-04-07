import { generateElement } from 'generate';

import { AttributeBody } from './object';

import type { Expression, JSXMemberExpression } from '@babel/types';
import type { Define } from 'handle/modifier';

export type Element = ElementInline | Define;

export class ElementInline extends AttributeBody {
  explicitTagName?: string | JSXMemberExpression;

  toExpression(): Expression {
    const { name } = this;
    const tagName = this.explicitTagName || (
      name && /^[A-Z]/.test(name) ? name : undefined
    )

    const scope = this.context.Imports;
    const info = generateElement(this);

    return scope.element(info, tagName);
  }

  applyModifier(mod: Define){
    for(const use of [mod, ...mod.includes]){
      this.includes.add(use);
      use.targets.add(this);
    }
  }
}