import * as t from 'syntax';

import { Context } from './context';

export function applyModifier(
  context: Context, element: t.Path<t.JSXElement>){

  const name = applyTagName(element);

  context = context.using[name] || context;

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

function applyTagName(element: t.Path<t.JSXElement>){
  const { openingElement, closingElement } = element.node;

  let tagName = openingElement.name;
  let isMemberExpression = false;

  while(tagName.type === "JSXMemberExpression"){
    tagName = tagName.property;
    isMemberExpression = true;
  }

  if(tagName.type !== "JSXIdentifier")
    throw new Error("Invalid tag type");

  let name = tagName.name;

  if(isMemberExpression || t.HTML_TAGS.includes(name) || /[A-Z]/.test(name[0]))
    return name;

  if(t.SVG_TAGS.includes(name))
    for(const item of element.getAncestry())
      if(!item.isJSXElement())
        break;
      else if(item.get("openingElement").get("name").isJSXIdentifier({ name: "svg" }))
        return name;

  const explicit = /(?:html|svg)-([a-zA-Z-]+)/.exec(name);
  const replaced = t.jsxIdentifier(explicit ? name = explicit[1] : "div");

  openingElement.name = replaced;

  if(closingElement)
    closingElement.name = replaced;

  return name;
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