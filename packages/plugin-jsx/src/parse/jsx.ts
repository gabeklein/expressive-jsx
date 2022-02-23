import { ParseErrors } from 'errors';
import { Prop } from 'handle/attributes';
import { ElementInline } from 'handle/definition';
import * as s from 'syntax';
import { HTML_TAGS } from 'syntax/jsx';

import type { Define } from 'handle/definition';
import type { JSXChild } from 'syntax/jsx';
import type * as t from 'syntax/types';

export type Element = ElementInline | Define;

const Oops = ParseErrors({
  InvalidPropValue: "Can only consume an expression or string literal as value here.",
  UnhandledChild: "Can't parse JSX child of type {1}",
  JSXMemberExpression: "Member Expression is not supported!",
  NonJSXIdentifier: "Cannot handle non-identifier!"
});

export function addElementFromJSX(
  path: t.Path<t.JSXElement>, parent: Define){

  let target = parent as Element;
  const tag = path.get("openingElement").get("name");

  if(!s.is(tag, "JSXIdentifier", { name: "this" })){
    const child = new ElementInline(target.context);

    applyTagName(child, tag.node);
    target.adopt(child);
    target = child;
  }

  parseJSX(target, path);
}

export function parseJSX(
  into: ElementInline | Define,
  element: t.Path<t.JSXElement>){

  const queue = [[into, element] as const];

  for(const [element, path] of queue){
    const tag = path.node.openingElement.name;
    const children = path.get("children");
    const attributes = path.get("openingElement").get("attributes");

    applyTagName(element, tag);

    for(const attribute of attributes)
      applyAttribute(element, attribute as any, queue);

    for(const path of children)
      if(s.is(path, "JSXElement")){
        const child = new ElementInline(element.context);

        element.adopt(child);
        queue.push([child, path as t.Path<t.JSXElement>]);
      }
      else
        applyChild(element, path);
  }
}

function applyChild(
  parent: Element,
  path: t.Path<JSXChild>){

  if(s.is(path, "JSXText")){
    const { value } = path.node;

    if(/^\n+ *$/.test(value))
      return;

    const text = value
      .replace(/ +/g, " ")
      .replace(/\n\s*/, "");

    parent.adopt(s.literal(text));
  }
  else if(s.is(path, "JSXExpressionContainer")){
    const { expression } = path.node;

    if(!s.is(expression, "JSXEmptyExpression"))
      parent.adopt(path.node.expression as t.Expression);
  }
  else
    Oops.UnhandledChild(path, path.type);
}

export function applyTagName(
  element: ElementInline | Define,
  tag: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName){

  let name;

  if(s.is(tag, "JSXMemberExpression")){
    name = tag.property.name;
    element.tagName = tag;
  }
  else if(s.is(tag, "JSXIdentifier")){
    name = tag.name;

    let explicit =
      /^[A-Z]/.test(name) ||
      HTML_TAGS.includes(name);

    if(/^html-.+/.test(name)){
      name = name.slice(5);
      explicit = true;
    }

    if(explicit || /^[A-Z]/.test(name))
      element.tagName = name;
  }
  else
    throw Oops.NonJSXIdentifier(tag);

  element.name = name;
  applyModifier(element, name);
}

function applyAttribute(
  parent: Element,
  attr: t.Path<t.JSXAttribute> | t.Path<t.JSXSpreadAttribute>,
  queue: (readonly [Element, t.Path<t.JSXElement>])[]){

  let name: string | false;
  let value: t.Expression | undefined;

  if(s.is(attr, "JSXSpreadAttribute")){
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
    const child = new ElementInline(parent.context);
    const prop = new Prop(name, child);

    applyTagName(child, path.node.openingElement.name);
    parent.add(prop);
    queue.push([child, path]);

    return child;
  }

  parent.add(
    new Prop(name, value || null)
  );
}

export function applyModifier(
  target: Element, from: string | Define){

  const apply = [] as Define[];
  let modify =
    from == "this"
      ? target.context.parent.ambient :
    typeof from == "string"
      ? target.context.getModifier(from) :
    from;

  while(modify){
    apply.push(modify);

    for(const use of [modify, ...modify.includes]){
      target.includes.add(use);
      use.targets.add(target);
    }

    for(const sub of modify.provides)
      target.context.setModifier(sub);

    modify = modify.next;
  }

  return apply;
}