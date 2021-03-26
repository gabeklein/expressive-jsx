import { generateElement } from 'generate';

import { AttributeBody } from './object';

import type { Expression, JSXMemberExpression, Statement } from '@babel/types';
import type { DefineElement, Define } from 'handle/modifier';
import type { InnerContent } from 'types';

export class ElementInline extends AttributeBody {
  primaryName?: string;
  explicitTagName?: string | JSXMemberExpression;

  statements: Statement[] = [];
  children: InnerContent[] = [];
  modifiers: Define[] = [];

  toExpression(): Expression {
    const info = generateElement(this);
    return this.context.Imports.element(info);
  }

  adopt(child: InnerContent){
    const index = this.children.push(child);

    if("context" in child)
      child.context.resolveFor(index);

    this.add(child);
  }

  use(define: DefineElement){
    this.context.elementMod(define);
  }
}