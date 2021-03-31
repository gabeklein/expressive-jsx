import { generateElement } from 'generate';

import { AttributeBody } from './object';

import type { Expression, JSXMemberExpression } from '@babel/types';
import type { Define, DefineElement } from 'handle/modifier';

export type Element = ElementInline | DefineElement;

export class ElementInline extends AttributeBody {
  explicitTagName?: string | JSXMemberExpression;

  modifiers = [] as Define[];

  toExpression(): Expression {
    const info = generateElement(this);
    return this.context.Imports.element(info);
  }

  applyModifier(mod: Define){
    this.modifiers.push(mod);
    mod.targets.add(this);
  }
}