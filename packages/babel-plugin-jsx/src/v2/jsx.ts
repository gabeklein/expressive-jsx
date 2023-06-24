import * as t from 'syntax';

import { Context } from './context';

export function applyModifier(context: Context, element: t.JSXElement){
  const name = getTagName(element);
  const explicit = /(?:html|svg)-([a-zA-Z-]+)/.exec(name);

  context = context.using[name];

  applyTagName(element,
    explicit ? explicit[1] : context.define.tagName || "div"
  );

  if(context){
    const { className } = context.define;
  
    if(className)
      applyClassName(element, className);
  }
}

function applyTagName(element: t.JSXElement, name: string){
  const { openingElement, closingElement } = element;

  openingElement.name = t.jsxIdentifier(name);

  if(closingElement)
    closingElement.name = t.jsxIdentifier(name);
}

function applyClassName(element: t.JSXElement, name: string){
  const { attributes } = element.openingElement;

  const hasClassName = attributes.some(attr => (
    attr.type === "JSXAttribute" && attr.name.name === "className"
  ));

  if(!hasClassName)
    attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier("className"),
        t.literal(name)
      )
    )
}

function getTagName(node: t.JSXElement){
  let tag = node.openingElement.name;

  while(tag.type === "JSXMemberExpression")
    tag = tag.property;

  if(tag.type !== "JSXIdentifier")
    throw new Error("Invalid tag type");

  return tag.name;
}

export function isImplicitReturn(path: t.Path<t.JSXElement> | t.Path<t.JSXFragment>){
  const parent = path.parentPath;

  if(!parent.isExpressionStatement() || !parent.parentPath!.parentPath!.isFunction())
    return false;

  parent.replaceWith(t.returns(path.node));
  path.skip();

  return true;
}