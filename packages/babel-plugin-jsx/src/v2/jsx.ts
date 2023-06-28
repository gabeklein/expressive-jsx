import * as t from 'syntax';

import { Context } from './context';
import { Define } from './define';

export function applyModifier(
  context: Context, element: t.Path<t.JSXElement>){

  const name = applyTagName(element);

  const apply = context.applicable(name);

  for(const context of apply)
    applyClassName(element.node, context.define);

  for(const attr of element.get("openingElement").get("attributes")){
    if(!attr.isJSXAttribute({ value: null }))
      continue;

    const apply = context.applicable(attr.node.name.name as string);

    if(!apply.size)
      continue

    attr.remove();
    apply.forEach(context => {
      applyClassName(element.node, context.define);
    });
  }

  if(apply.size == 1){
    context = apply.values().next().value;
    element.get("children").forEach(child => {
      if(child.type !== "JSXElement")
        return;
  
      child.data = { context };
    })
  }
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

function applyClassName(element: t.JSXElement, define: Define){
  const name = define.className;

  if(!name)
    return;

  const { attributes } = element.openingElement;

  const className = attributes.find(attr => (
    attr.type === "JSXAttribute" &&
    attr.name.name === "className"
  )) as t.JSXAttribute | undefined;

  if(!className){
    attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier("className"),
        t.literal(name)
      )
    )
    return;
  }

  const cx = define.context.root.file.ensure("$runtime", "classNames");
  const { value } = className;
  
  if(t.isStringLiteral(value))
    className.value = t.jsxExpressionContainer(
      t.call(cx, value, t.literal(name))
    )
  else if(t.isJSXExpressionContainer(value)){
    const existing = value.expression as t.Expression;
  
    if(t.isCallExpression(existing) && t.isIdentifier(existing.callee, { name: cx.name }))
      existing.arguments.push(t.literal(name));
    else
      value.expression = t.call(cx, existing, t.literal(name));
  }
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