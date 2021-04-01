import { generateElement } from 'generate';

import { AttributeBody } from './object';

import type { Expression, JSXMemberExpression } from '@babel/types';
import type { Define } from 'handle/modifier';

export type Element = ElementInline | Define;

export class ElementInline extends AttributeBody {
  explicitTagName?: string | JSXMemberExpression;

  modifiers = [] as Define[];

  toExpression(): Expression {
    const info = generateElement(this);
    return this.context.Imports.element(info);
  }

  applyModifier(mod: Define){
    for(const use of [mod, ...mod.includes]){
      this.modifiers.push(use);
      use.targets.add(this);
    }
  }
}