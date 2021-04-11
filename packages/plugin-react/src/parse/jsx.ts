import { isJSXIdentifier, isJSXMemberExpression, isJSXSpreadAttribute, stringLiteral } from '@babel/types';
import { ParseErrors } from 'errors';
import { ElementInline, Prop } from 'handle';

import type { NodePath as Path } from '@babel/traverse';
import type {
  Expression,
  JSXAttribute,
  JSXElement,
  JSXSpreadAttribute
} from '@babel/types';
import type { Element } from 'handle';

const Oops = ParseErrors({
  InvalidPropValue: "Can only consume an expression or string literal as value here.",
  UnhandledChild: "Can't parse JSX child of type {1}",
  JSXMemberExpression: "Member Expression is not supported!",
  NonJSXIdentifier: "Cannot handle non-identifier!"
});

const COMMON_HTML = [
  "article", "blockquote", "input",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "a", "ul", "ol", "li",
  "i", "b", "em", "strong", "span",
  "hr", "img", "div", "br"
];

export function addElementFromJSX(
  { node }: Path<JSXElement>, parent: Element){

  if(!isJSXIdentifier(node.openingElement.name, { name: "this" }))
    parent = createElement(node, parent);

  const queue = [[parent, node] as const];

  for(const [element, node] of queue){
    const { children } = node;
    const { attributes } = node.openingElement;

    for(const attribute of attributes)
      applyAttribute(element, attribute);

    for(const node of children){
      switch(node.type){
        case "JSXElement":
          queue.push([
            createElement(node, element),
            node
          ]);
        break;

        case "JSXText":
          if(/^\n+ *$/.test(node.value))
            continue;

          element.add(stringLiteral(
            node.value.replace(/\s+/g, " ")
          ));
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
  parent: Element){

  const target = new ElementInline(parent.context);
  const tag = element.openingElement.name;
  let name;

  if(isJSXMemberExpression(tag)){
    name = tag.property.name;
    target.explicitTagName = tag;
  }
  else if(isJSXIdentifier(tag)){
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

    if(explicit)
      target.explicitTagName = name;
  }
  else
    throw Oops.NonJSXIdentifier(tag);

  target.name = name;
  target.applyModifiers(name);

  parent.adopt(target);

  return target;
}

function applyAttribute(
  parent: Element,
  attr: JSXAttribute | JSXSpreadAttribute){

  let name: string | false;
  let value: Expression;

  if(isJSXSpreadAttribute(attr)){
    name = false;
    value = attr.argument;
  }
  else {
    const expression = attr.value;
    name = attr.name.name as string;

    if(expression === null){
      parent.applyModifiers(name);
      return;
    }
  
    switch(expression.type){
      case "JSXExpressionContainer":
        value = expression.expression as Expression;
      break;
  
      case "StringLiteral":
        value = expression;
      break;
  
      default:
        throw Oops.InvalidPropValue(expression);
    }
  }

  parent.add(
    new Prop(name, value)
  );
}