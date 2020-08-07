import { Expression, isJSXIdentifier, JSXAttribute, JSXElement, JSXIdentifier, stringLiteral } from '@babel/types';
import { ElementInline, Prop } from 'handle';
import { ParseErrors } from 'shared';

import { applyNameImplications } from './element';

const Error = ParseErrors({
  InvalidPropValue: "Can only consume an expression or string literal as value here.",
  UnhandledChild: "Can't parse JSX child of type {1}"
})

const commonTags = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "a", "ul", "li", "blockquote",
  "i", "b", "em", "strong",
  "hr", "img", "div",
]

type enqueueFn = (
  element: JSXElement, parent: ElementInline
) => ElementInline

export function addElementFromJSX(
  node: JSXElement, 
  parent: ElementInline){

  const queue: [JSXElement, ElementInline][] = [];
  const push: enqueueFn = (element, parent) => {
    const child = new ElementInline(parent.context);
    queue.push([element, child]);
    return child;
  }

  const child = push(node, parent);

  for(const [element, target] of queue)
    parseJSXElement(element, target, push);

  parent.adopt(child);
}

export function parseJSXElement(
    node: JSXElement, 
    target: ElementInline,
    enqueue: enqueueFn){

    const { openingElement, children } = node;
    const { name, attributes } = openingElement;

    if(isJSXIdentifier(name)){
      const tag = name.name;
      const isCommonTag = commonTags.indexOf(tag) >= 0;

      if(isCommonTag)
        applyNameImplications(tag, target, true, "html");
      else {
        applyNameImplications("span", target, true, "html");
        applyNameImplications(tag, target);
      }
    }

    for(const attr of attributes)
      switch(attr.type){
        case "JSXAttribute":
          parseAttribute(attr, target);
        break;

        case "JSXSpreadAttribute": {
          const prop = new Prop(false, attr.argument);
          target.add(prop);
        } break;
      }

    for(const child of children)
      switch(child.type){
        case "JSXElement":
          target.adopt(
            enqueue(child, target)
          )
        break;

        case "JSXText":
          target.add(
            stringLiteral(
              child.value.replace(/\s+/g, " ")
            )
          );
        break;

        case "JSXExpressionContainer":
          const { expression } = child;
          target.add(
            expression as Expression
          );
        break;

        default:
          throw Error.UnhandledChild(child, child.type)
      }
}

function parseAttribute(
  attr: JSXAttribute, 
  parent: ElementInline){

  const name = attr.name as JSXIdentifier;
  const propValue = attr.value;

  if(propValue === null){
    applyNameImplications(name.name, parent, true);
    return
  }
  
  let value: Expression;

  switch(propValue.type){
    case "JSXExpressionContainer":
      value = propValue.expression as Expression;
    break;

    case "StringLiteral":
      value = propValue;
    break;

    default:
      throw Error.InvalidPropValue(propValue);
  }
    
  const prop = new Prop(name.name, value);
  parent.add(prop);
}