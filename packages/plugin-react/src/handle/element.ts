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

  applyModifiers(name: string){
    let modify = this.context.elementMod(name);
  
    while(modify){
      this.modifiers.push(modify);
      modify.targets.add(this);
  
      for(const sub of modify.includes)
        this.context.elementMod(sub);
  
      modify = modify.next;
    }
  }
}