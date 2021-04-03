import { generateElement } from 'generate';

import { AttributeBody } from './object';

import type { Expression, JSXMemberExpression } from '@babel/types';
import type { Define } from 'handle/modifier';

export type Element = ElementInline | Define;

export class ElementInline extends AttributeBody {
  explicitTagName?: string | JSXMemberExpression;

  toExpression(collapse?: boolean): Expression {
    const scope = this.context.Imports;
    const info = generateElement(this);

    return collapse
      ? scope.container(info)
      : scope.element(info);
  }

  applyModifier(mod: Define){
    for(const use of [mod, ...mod.includes]){
      this.includes.add(use);
      use.targets.add(this);
    }
  }
}