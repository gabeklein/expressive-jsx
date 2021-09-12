import { ParseErrors } from 'errors';
import { Prop } from 'handle/attributes';
import { DefineElement } from 'handle/definition';
import { ElementInline } from 'handle/element';
import * as t from 'syntax';

import { parse } from './body';

import type { Define } from 'handle/definition';
import type {
  Expression,
  JSXAttribute,
  JSXElement,
  JSXIdentifier,
  JSXMemberExpression,
  JSXNamespacedName,
  JSXSpreadAttribute,
  Path
} from 'syntax';

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
  path: Path<JSXElement>, parent: DefineElement){

  let target = parent as Element;
  const tag = path.get("openingElement").get("name");

  if(!tag.isJSXIdentifier({ name: "this" })){
    const child = createElement(tag.node, target);

    target.adopt(child);
    target = child;
  }

  const queue = [[target, path] as const];

  for(const [element, path] of queue){
    const children = path.get("children");
    const attributes = path.get("openingElement").get("attributes");

    for(const attribute of attributes)
      applyAttribute(element, attribute as any);

    children.forEach((path, index) => {
      if(path.isJSXElement()){
        const child = createElement(path.node.openingElement.name, element);

        element.adopt(child);
        queue.push([child, path]);
      }

      else if(path.isJSXText()){
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

        element.adopt(t.literal(text));
      }

      else if(path.isJSXExpressionContainer())
        element.adopt(path.node.expression as Expression);

      else
        Oops.UnhandledChild(path, path.type);
    })
  }
}

function createElement(
  tag: JSXIdentifier | JSXMemberExpression | JSXNamespacedName,
  parent: Element){

  const target = new ElementInline(parent.context);
  let name;

  if(tag.type == "JSXMemberExpression"){
    name = tag.property.name;
    target.tagName = tag;
  }
  else if(tag.type == "JSXIdentifier"){
    name = tag.name;

    if(name == "s")
      name = "span";

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
  target.uses(name);

  return target;
}

function applyAttribute(
  parent: Element,
  attr: Path<JSXAttribute> | Path<JSXSpreadAttribute>){

  let name: string | false;
  let value: Expression | undefined;

  if(attr.isJSXSpreadAttribute()){
    const arg = attr.get("argument");

    if(arg.isDoExpression()){
      const define = new DefineElement(parent.context, parent.name!);
      parent.use(define);
      parse(define, arg, "body");
      return;
    }

    name = false;
    value = arg.node;
  }
  else {
    const expression = attr.node.value;
    name = attr.node.name.name as string;

    if(expression === null){
      const applied = parent.uses(name);

      if(/^[A-Z]/.test(parent.name!))
        for(const define of applied){
          define.priority = 3;
          Object.defineProperty(define, "collapsable", {
            value: false
          })
        }

      return;
    }
  
    switch(expression.type){
      case "JSXExpressionContainer":
        value = expression.expression as Expression;
      break;
  
      case "StringLiteral":
        if(name == "src" && /^\.\//.test(expression.value))
          value = t.require(expression.value)
        else
          value = expression;
      break;
  
      default:
        throw Oops.InvalidPropValue(expression);
    }
  }

  parent.add(
    new Prop(name, value || null)
  );
}