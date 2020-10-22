import { isJSXMemberExpression } from '@babel/types';
import { Expression, isJSXIdentifier, JSXAttribute, JSXElement, JSXIdentifier, stringLiteral } from '@babel/types';
import { ElementInline, Prop } from 'handle';
import { ParseErrors } from 'shared';

import { applyNameImplications, applyPrimaryName } from './element';

const Error = ParseErrors({
  InvalidPropValue: "Can only consume an expression or string literal as value here.",
  UnhandledChild: "Can't parse JSX child of type {1}",
  JSXMemberExpression: "Member Expression is not supported!",
  NonJSXIdentifier: "Cannot handle non-identifier!"
})

type enqueueFn = (
  parent: ElementInline,
  element: JSXElement
) => ElementInline;

export function addElementFromJSX(
  node: JSXElement,
  parent: ElementInline){

  const queue: [ElementInline, JSXElement][] = [];

  function push(parent: ElementInline, element: JSXElement){
    const { name } = element.openingElement;
    let applyTo = parent;

    if(isJSXMemberExpression(name))
      throw Error.JSXMemberExpression(name);

    if(!isJSXIdentifier(name))
      throw Error.NonJSXIdentifier(name);
    
    if(name.name != "this"){
      applyTo = new ElementInline(parent.context);
      applyPrimaryName(applyTo, name.name, "div");
    }

    queue.push([applyTo, element]);
    return applyTo;
  }
  
  const child = push(parent, node);

  if(child !== parent)
    parent.adopt(child);

  for(const [target, element] of queue)
    parseJSXElement(target, element, push);
}

export function parseJSXElement(
  subject: ElementInline,
  node: JSXElement,
  enqueue: enqueueFn){

  const { openingElement, children } = node;

  for(const attr of openingElement.attributes)
    switch(attr.type){
      case "JSXAttribute":
        parseAttribute(attr, subject);
      break;

      case "JSXSpreadAttribute": {
        const prop = new Prop(false, attr.argument);
        subject.add(prop);
      } break;
    }

  for(const child of children)
    switch(child.type){
      case "JSXElement":
        subject.adopt(
          enqueue(subject, child)
        )
      break;

      case "JSXText":
        if(/^\n+ *$/.test(child.value))
          continue;
        subject.add(
          stringLiteral(
            child.value.replace(/\s+/g, " ")
          )
        );
      break;

      case "JSXExpressionContainer":
        const { expression } = child;
        subject.add(
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
    applyNameImplications(parent, name.name);
    return;
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