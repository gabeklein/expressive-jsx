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