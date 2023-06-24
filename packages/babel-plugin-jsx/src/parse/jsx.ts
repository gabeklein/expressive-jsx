import { ParseErrors } from 'errors';
import { Prop } from 'handle/attributes';
import { ElementInline } from 'handle/definition';
import * as $ from 'syntax';
import { HTML_TAGS, SVG_TAGS } from 'syntax/jsx';
import * as t from 'syntax/types';

import type { Define } from 'handle/definition';
import type { JSXChild } from 'syntax/jsx';

export type Element = ElementInline | Define;

const Oops = ParseErrors({
  InvalidPropValue: "Can only consume an expression or string literal as value here.",
  UnhandledChild: "Can't parse JSX child of type {1}",
  JSXMemberExpression: "Member Expression is not supported!",
  NonJSXIdentifier: "Cannot handle non-identifier!"
});

export function addElementFromJSX(
  parent: Define, path: t.Path<t.JSXElement | t.JSXFragment>){

  let target = parent as Element;

  if(path.isJSXElement()){
    const tag = (path as t.Path<t.JSXElement>).get("openingElement").get("name");
  
    if(!tag.isJSXIdentifier({ name: "this" })){
      const child = new ElementInline(target.context);
  
      applyTagName(child, tag.node);
      target.adopt(child);
      target = child;
    }
  }

  parseJSX(target, path);
}

export function parseJSX(
  into: ElementInline | Define,
  element: t.Path<t.JSXElement | t.JSXFragment>){

  const queue = [[into, element as t.Path<t.JSXElement>] as const];

  for(const [element, path] of queue){
    const children = path.get("children");

    if(path.isJSXElement()){
      const { name: tag, selfClosing } = path.node.openingElement;
      const attributes = path.get("openingElement").get("attributes");

      if(element instanceof ElementInline)
        element.selfClosing = selfClosing;

      applyTagName(element, tag);

      for(const attribute of attributes)
        applyAttribute(element, attribute as any, queue);
    }

    for(const path of children)
      applyChild(element, path, queue);
  }
}

function applyChild(
  element: Element,
  path: t.Path<JSXChild>,
  queue: (readonly [Element, t.Path<t.JSXElement>])[]
){
  if(path.isJSXElement()){
    const child = new ElementInline(element.context);

    element.adopt(child);
    queue.push([child, path as t.Path<t.JSXElement>]);
  }
  else if(path.isJSXText()){
    const { value } = path.node;

    if(/^\n+ *$/.test(value))
      return;

    const text = value
      .replace(/ +/g, " ")
      .replace(/\n\s*/g, "");

    element.adopt($.literal(text));
  }
  else if(path.isJSXExpressionContainer()){
    const { expression } = path.node;

    if(!t.isJSXEmptyExpression(expression))
      element.adopt(path.node.expression as t.Expression);
  }
  else
    Oops.UnhandledChild(path, path.type);
}

export function applyTagName(
  element: ElementInline | Define,
  tag: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName){

  let name;

  if(t.isJSXMemberExpression(tag)){
    name = tag.property.name;
    element.tagName = tag;
  }
  else if(t.isJSXIdentifier(tag)){
    name = tag.name;

    if(name === "this")
      return;

    element.name = name;

    let explicit = /^[A-Z]/.test(name);

    if(/^(html|svg)-.+/.test(name)){
      name = name.slice(5);
      explicit = true;
    }

    if(HTML_TAGS.includes(name))
      explicit = true;

    else if(SVG_TAGS.includes(name)){
      element.name = name;
      let within: ElementInline | undefined = element;

      while(within instanceof ElementInline)
        if(within.name === "svg"){
          explicit = true;
          break;
        }
        else {
          within = within.parent;
          continue;
        }
    }

    if(explicit)
      element.tagName = name;
  }
  else
    throw Oops.NonJSXIdentifier(tag);

  element.modify(name);
}

function applyAttribute(
  parent: Element,
  attr: t.Path<t.JSXAttribute> | t.Path<t.JSXSpreadAttribute>,
  queue: (readonly [Element, t.Path<t.JSXElement>])[]){

  let name: string | false;
  let value: t.Expression | undefined;

  if(attr.isJSXSpreadAttribute()){
    name = false;
    value = attr.node.argument;
  }
  else {
    const expression = attr.node.value;
    name = attr.node.name.name as string;

    if(!expression){
      const applied = parent.modify(name);

      if(!applied.length)
        value = t.booleanLiteral(true);
        
      else {
        if(/^[A-Z]/.test(parent.name!))
          for(const define of applied)
            define.priority = 3;

        return;
      }
    }
    else switch(expression.type){
      case "JSXExpressionContainer":
        value = expression.expression as t.Expression;
      break;

      case "StringLiteral":
        if(name == "src" && /^\.\//.test(expression.value))
          value = $.requires(expression.value)
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