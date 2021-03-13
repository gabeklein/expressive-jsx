import { AttributeBody } from 'handle';
import { ParseContent, parser } from 'parse';
import { generateElement } from 'generate';

import type {
  DoExpression,
  Expression,
  JSXMemberExpression,
} from '@babel/types';
import type { ElementModifier, Modifier } from 'handle/modifier';
import type { InnerContent } from 'types';

export class ElementInline extends AttributeBody {
  parse = parser(ParseContent);

  doBlock?: DoExpression
  primaryName?: string;
  children = [] as InnerContent[];
  explicitTagName?: string | JSXMemberExpression;
  modifiers = [] as Modifier[];

  get tagName(): string | JSXMemberExpression {
    const { name, explicitTagName } = this;
    return explicitTagName || (
      name && /^[A-Z]/.test(name) ? name : "div"
    );
  }

  toExpression(): Expression {
    const info = generateElement(this);
    return this.context.Imports.element(info);
  }

  didExitOwnScope?(): void;

  adopt(child: InnerContent){
    const index = this.children.push(child);

    if("context" in child)
      child.context.resolveFor(index);

    this.add(child);
  }

  applyModifier(mod: ElementModifier){
    this.context.elementMod(mod);
  }
}