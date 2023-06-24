import * as t from 'syntax';

import { Context } from './context';

export function applyModifier(
  context: Context, element: t.Path<t.JSXElement>){

  const name = getTagName(element.node);
  const explicit = /(?:html|svg)-([a-zA-Z-]+)/.exec(name);

  context = context.using[name] || context;

  if(!element.isJSXMemberExpression() && !/[A-Z]/.test(name))
    applyTagName(element.node, explicit ? explicit[1] : "div");

  if(context){
    const { className } = context.define;
  
    if(className)
      applyClassName(element.node, className);
  }

  element.get("children").forEach(child => {
    if(child.type !== "JSXElement")
      return;

    child.data = { context };
  })
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

export function isImplicitReturn(
  path: t.Path<t.JSXElement> | t.Path<t.JSXFragment>){

  const statement = path.parentPath;
  const block = statement.parentPath as t.Path<t.BlockStatement>;
  const within = block.parentPath as t.Path;

  if(!statement.isExpressionStatement() || !within.isFunction())
    return false;

  if(block.node.body.length === 1
  && within.isArrowFunctionExpression())
    block.replaceWith(path.node);
  else
    statement.replaceWith(t.returns(path.node));

  path.skip();

  return true;
}