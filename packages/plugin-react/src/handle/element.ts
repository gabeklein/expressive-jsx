import { AttributeBody } from 'handle';

import { ParseContainer, ParseContent, parser } from './';

import type {
  DoExpression,
  JSXMemberExpression,
  Statement,
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

export class ComponentContainer extends ElementInline {
  parse = parser(ParseContainer);

  statements = [] as Statement[];
}