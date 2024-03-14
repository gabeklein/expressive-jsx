import type { JSXElement } from '@babel/types';
import { t } from '../types';

export function setTagName(node: JSXElement, name: string){
  const { openingElement, closingElement } = node;
  const tag = t.jsxIdentifier(name);

  openingElement.name = tag;

  if(closingElement)
    closingElement.name = tag;
}

export function getProp(node: JSXElement, name: string){
  const { attributes } = node.openingElement;

  for(const attr of attributes)
    if(t.isJSXAttribute(attr) && attr.name.name === name){
      const { value } = attr;

      if(t.isJSXExpressionContainer(value) && t.isExpression(value.expression))
        return value.expression;

      if(t.isExpression(value))
        return value;
    }
}