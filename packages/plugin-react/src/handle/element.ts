import { AttributeBody } from './object';
import { ParseContent, parser } from 'parse';
import { generateElement } from 'generate';

import type {
  DoExpression,
  Expression,
  JSXMemberExpression,
} from '@babel/types';
import type { DefineElement, Define } from 'handle/modifier';
import type { InnerContent } from 'types';

export class ElementInline extends AttributeBody {
  parse = parser(ParseContent);

  doBlock?: DoExpression
  primaryName?: string;
  explicitTagName?: string | JSXMemberExpression;

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