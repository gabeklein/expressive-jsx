import * as t from '../types';

export function setTagName(
  element: t.NodePath<t.JSXElement> | t.JSXElement,
  tagName: string){

  if(element instanceof t.NodePath)
    element = element.node;

  const { openingElement, closingElement } = element;
  const tag = t.jsxIdentifier(tagName);

  openingElement.name = tag;

  if(closingElement)
    closingElement.name = tag;
}

export function getProp(
  path: t.NodePath<t.JSXElement>,
  name: string){

  const { attributes } = path.node.openingElement;

  for(const attr of attributes)
    if(t.isJSXAttribute(attr) && attr.name.name === "className"){
      const { value } = attr;

      if(t.isJSXExpressionContainer(value) && t.isExpression(value.expression))
        return value.expression;

      if(t.isExpression(value))
        return value;
    }
}