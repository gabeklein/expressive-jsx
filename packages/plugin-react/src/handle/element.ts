import { doExpression } from '@babel/types';
import { generateElement } from 'generate';
import { ParseContent, parser } from 'parse';
import { meta } from 'shared';

import { AttributeBody } from './object';

import type { NodePath as Path } from '@babel/traverse';
import type {
  DoExpression,
  Expression,
  JSXMemberExpression,
  Statement
} from '@babel/types';
import type { DefineElement, Define } from 'handle/modifier';
import type { InnerContent } from 'types';

export class ElementInline extends AttributeBody {
  parse = parser(ParseContent);

  doBlock?: DoExpression
  primaryName?: string;
  explicitTagName?: string | JSXMemberExpression;

  statements: Statement[] = [];
  children: InnerContent[] = [];
  modifiers: Define[] = [];

  protected handleBody(content: Path<Statement>){
    if(!content.isBlockStatement())
      this.parse(content);
    else {
      const body = doExpression(content.node);
      meta(body, this);
      this.doBlock = body;  
      content.replaceWith(body);
    }
  }

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