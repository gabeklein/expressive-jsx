import { generateElement } from 'generate';

import { AttributeBody } from './object';

import type { Expression, JSXMemberExpression } from '@babel/types';
import type { Define } from 'handle/modifier';

export class ElementInline extends AttributeBody {
  primaryName?: string;
  explicitTagName?: string | JSXMemberExpression;

  modifiers = [] as Define[];

  toExpression(): Expression {
    const info = generateElement(this);
    return this.context.Imports.element(info);
  }
}