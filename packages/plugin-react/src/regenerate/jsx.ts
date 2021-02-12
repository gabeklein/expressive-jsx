import {
  isExpression,
  isJSXElement,
  isStringLiteral,
  isTemplateLiteral,
  jsxAttribute,
  jsxClosingElement,
  jsxElement,
  jsxExpressionContainer,
  jsxIdentifier,
  JSXMemberExpression,
  jsxOpeningElement,
  jsxSpreadAttribute,
  jsxText,
} from '@babel/types';
import { templateToMarkup } from 'deprecate';
import { GenerateReact } from 'regenerate';
import { ElementReact } from 'translate';
import { ContentLike, IsLegalAttribute, JSXContent, PropData } from 'types';

export class GenerateJSX extends GenerateReact {
  protected createElement(
    tag: null | string | JSXMemberExpression,
    properties: PropData[] = [],
    content: ContentLike[] = [],
    acceptBr?: boolean
  ){
    const scope = this.Imports;

    if(acceptBr === undefined)
      acceptBr = !tag || typeof tag == "string" && /^[a-z]/.test(tag);

    if(!tag)
      tag = scope.ensure("$pragma", "Fragment").name;

    const type = typeof tag == "string" ? jsxIdentifier(tag) : tag;
    const props = properties.map(createAttribute);
    const children = [] as JSXContent[];

    for(let child of content){
      if(isTemplateLiteral(child))
        children.push(...templateToMarkup(child, acceptBr));
      else 
        children.push(this.normalize(child));
    }

    scope.ensure("$pragma", "default", "React");

    return jsxElement(
      jsxOpeningElement(type, props),
      jsxClosingElement(type),
      children,
      children.length > 0
    )
  }

  private normalize(child: ContentLike){
    if("toExpression" in child)
      child = child.toExpression(this);

    if(child instanceof ElementReact)
      return this.createElement(
        child.tagName, child.props, child.children
      )

    return (
      isJSXElement(child) ?
        child :
      isStringLiteral(child) && !/\{/.test(child.value) ?
        jsxText(child.value) :
      isExpression(child) ?
        jsxExpressionContainer(child) :
      child
    )
  }
}

function createAttribute({ name, value }: PropData){
  if(typeof name !== "string")
    return jsxSpreadAttribute(value);

  if(IsLegalAttribute.test(name) == false)
    throw new Error(`Illegal characters in prop named ${name}`)

  const insertedValue =
    isStringLiteral(value)
      ? value.value === "true" ? null : value
      : jsxExpressionContainer(value)

  return jsxAttribute(
    jsxIdentifier(name),
    insertedValue
  )
}