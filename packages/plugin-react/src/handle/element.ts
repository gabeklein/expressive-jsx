import { AttributeBody, ComponentFor, ComponentIf, ParseAttributes } from 'handle';
import { addElementFromJSX } from 'parse';

import { parser } from './parse';

import type { NodePath as Path } from '@babel/traverse';
import type {
  DoExpression,
  IfStatement,
  JSXMemberExpression,
  Statement,
} from '@babel/types';
import type { ElementModifier, Modifier } from 'handle/modifier';
import type { ParserFor } from './parse';
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

export const ParseContent: ParserFor<ElementInline> = {
  ...ParseAttributes,

  JSXElement({ node }){
    addElementFromJSX(node, this);
  },

  IfStatement(path: Path<IfStatement>){
    ComponentIf.insert(path, this);
  },

  ForInStatement(path){
    ComponentFor.insert(path, this);
  },

  ForOfStatement(path){
    ComponentFor.insert(path, this);
  },

  ForStatement(path){
    ComponentFor.insert(path, this);
  }
}

export class ComponentContainer extends ElementInline {
  parse = parser(ParseContainer);

  statements = [] as Statement[];
}

export const ParseContainer: ParserFor<ComponentContainer> = {
  ...ParseContent,

  VariableDeclaration({ node }){
    this.statements.push(node);
  },

  DebuggerStatement({ node }){
    this.statements.push(node);
  },

  FunctionDeclaration({ node }){
    this.statements.push(node);
  }
}