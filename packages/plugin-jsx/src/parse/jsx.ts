import { ParseErrors } from 'errors';
import { Prop } from 'handle/attributes';
import { ElementInline } from 'handle/element';
import * as s from 'syntax';

import type { DefineElement } from 'handle/definition';
import type * as t from 'syntax/types';
import type { Define } from 'handle/definition';

export type Element = ElementInline | Define;

const Oops = ParseErrors({
  InvalidPropValue: "Can only consume an expression or string literal as value here.",
  UnhandledChild: "Can't parse JSX child of type {1}",
  JSXMemberExpression: "Member Expression is not supported!",
  NonJSXIdentifier: "Cannot handle non-identifier!"
});

const COMMON_HTML = [
  "article", "blockquote", "input",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "a", "ul", "ol", "li", "input",
  "i", "b", "em", "strong", "span",
  "hr", "img", "div", "br"
];

export function addElementFromJSX(
  path: t.Path<t.JSXElement>, parent: DefineElement){

  let target = parent as Element;
  const tag = path.get("openingElement").get("name");

  if(!s.assert(tag, "JSXIdentifier", { name: "this" })){
    const child = createElement(tag.node, target);

    target.adopt(child);
    target = child;
  }

  const queue = [[target, path] as const];

  for(const [element, path] of queue){
    const children = path.get("children");
    const attributes = path.get("openingElement").get("attributes");

    for(const attribute of attributes)
      applyAttribute(element, attribute as any, queue);

    children.forEach((path, index) => {
      const child = applyChild(element, path, index, children);

      if(child)
        queue.push([child, path as t.Path<t.JSXElement>]);
    })
  }
}

type JSXChild =
  | t.JSXElement
  | t.JSXFragment
  | t.JSXExpressionContainer
  | t.JSXSpreadChild
  | t.JSXText;

function applyChild(
  parent: Element,
  path: t.Path<JSXChild>,
  index: number,
  children: (typeof path)[]){

  if(s.assert(path, "JSXElement")){
    const child = createElement(path.node.openingElement.name, parent);

    parent.adopt(child);

    return child;
  }

  if(s.assert(path, "JSXText")){
    const { value } = path.node;

    if(/^\n+ *$/.test(value))
      return;

    let text = value
      .replace(/ +/g, " ")
      .replace(/\n\s*/, "");

    if(!index)
      text = text.trimLeft();

    if(index == children.length - 1)
      text = text.trimRight();

    parent.adopt(s.literal(text));
  }

  else if(s.assert(path, "JSXExpressionContainer")){
    const { expression } = path.node;

    if(!s.assert(expression, "JSXEmptyExpression"))
      parent.adopt(path.node.expression as t.Expression);
  }

  else
    Oops.UnhandledChild(path, path.type);
}

function createElement(
  tag: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName,
  parent: Element){

  const target = new ElementInline(parent.context);
  let name;

  if(s.assert(tag, "JSXMemberExpression")){
    name = tag.property.name;
    target.tagName = tag;
  }
  else if(s.assert(tag, "JSXIdentifier")){
    name = tag.name;

    let explicit =
      /^[A-Z]/.test(name) ||
      COMMON_HTML.includes(name);

    if(/^html-.+/.test(name)){
      name = name.slice(5);
      explicit = true;
    }

    if(explicit || /^[A-Z]/.test(name))
      target.tagName = name;
  }
  else
    throw Oops.NonJSXIdentifier(tag);

  target.name = name;
  applyModifier(target, name);

  return target;
}

function applyModifier(target: ElementInline, name: string){
  const apply = target.context.getApplicable(name);

  for(const mod of apply)
    for(const use of [mod, ...mod.includes]){
      target.includes.add(use);
      use.targets.add(target);
    }
  
  return apply;
}

function applyAttribute(
  parent: ElementInline,
  attr: t.Path<t.JSXAttribute> | t.Path<t.JSXSpreadAttribute>,
  queue: (readonly [Element, t.Path<t.JSXElement>])[]){

  let name: string | false;
  let value: t.Expression | undefined;

  if(s.assert(attr, "JSXSpreadAttribute")){
    name = false;
    value = attr.node.argument;
  }
  else {
    const expression = attr.node.value;
    name = attr.node.name.name as string;

    if(expression === null){
      const applied = applyModifier(parent, name);

      if(/^[A-Z]/.test(parent.name!))
        for(const define of applied)
          define.priority = 3;

      return;
    }
  
    switch(expression.type){
      case "JSXExpressionContainer":
        value = expression.expression as t.Expression;
      break;
  
      case "StringLiteral":
        if(name == "src" && /^\.\//.test(expression.value))
          value = s.require(expression.value)
        else
          value = expression;
      break;
  
      default:
        throw Oops.InvalidPropValue(expression);
    }
  }

  if(value.type == "JSXElement"){
    const path = attr.get("value.expression") as t.Path<t.JSXElement>;
    const child = createElement(path.node.openingElement.name, parent);
    const prop = new Prop(name, child);

    parent.add(prop);
    queue.push([child, path]);

    return child;
  }

  parent.add(
    new Prop(name, value || null)
  );
}