import { isJSXIdentifier, isJSXMemberExpression, stringLiteral } from '@babel/types';
import { ParseErrors } from 'errors';
import { ElementInline, Prop } from 'handle';
import { applyNameImplications, applyPrimaryName } from 'parse';

import type {
  Expression,
  JSXAttribute,
  JSXElement,
  JSXIdentifier,
  JSXSpreadAttribute
} from '@babel/types';

const Oops = ParseErrors({
  InvalidPropValue: "Can only consume an expression or string literal as value here.",
  UnhandledChild: "Can't parse JSX child of type {1}",
  JSXMemberExpression: "Member Expression is not supported!",
  NonJSXIdentifier: "Cannot handle non-identifier!"
});

export function addElementFromJSX(
  node: JSXElement,
  parent: ElementInline){

  const shouldApplyToSelf = 
    isJSXIdentifier(node.openingElement.name, { name: "this" })

  if(!shouldApplyToSelf)
    parent = createElement(node, parent);

  const queue = [[parent, node] as const];

  for(const [element, node] of queue){
    const { children } = node;
    const { attributes } = node.openingElement;

    for(const attribute of attributes)
      applyAttribute(element, attribute);

    for(const node of children){
      switch(node.type){
        case "JSXElement": {
          const child = createElement(node, element);
          queue.push([child, node]);
        }
        break;

        case "JSXText":
          if(/^\n+ *$/.test(node.value))
            continue;

          const text = node.value.replace(/\s+/g, " ");
          element.add(stringLiteral(text));
        break;
    
        case "JSXExpressionContainer":
          element.add(node.expression as Expression);
        break;
    
        default:
          throw Oops.UnhandledChild(node, node.type)
      }
    }
  }
}

function createElement(
  element: JSXElement,
  parent: ElementInline
){
  let target = new ElementInline(parent.context);
  const { name } = element.openingElement;

  if(isJSXMemberExpression(name)){
    applyNameImplications(target, name.property.name, true)
    target.explicitTagName = name;
  }
  else if(!isJSXIdentifier(name)){
    throw Oops.NonJSXIdentifier(name);
  }
  else if(/^html-.+/.test(name.name)){
    const tag = name.name.slice(5);
    applyNameImplications(target, tag, true, "html")
  }
  else
    applyPrimaryName(target, name.name, "div");

  parent.adopt(target);

  return target;
}

function applyAttribute(
  parent: ElementInline,
  attr: JSXAttribute | JSXSpreadAttribute){

  if(attr.type == "JSXSpreadAttribute"){
    const prop = new Prop(false, attr.argument);
    parent.add(prop);
    return;
  }

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
      throw Oops.InvalidPropValue(propValue);
  }

  parent.add(
    new Prop(name.name, value)
  );
}