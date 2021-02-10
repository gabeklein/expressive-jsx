import {
  Expression,
  isExpression,
  isJSXElement,
  isStringLiteral,
  isTemplateLiteral,
  jsxAttribute,
  jsxClosingElement,
  jsxElement,
  jsxExpressionContainer,
  JSXIdentifier,
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
  element(src: ElementReact){
    return this.createElement(src.tagName, src.props, src.children);
  }

  fragment(
    children?: ContentLike[],
    key?: Expression
  ){
    const props = key && [{ name: "key", value: key }];
    return this.createElement(null, props, children);
  }

  private createElement(
    tag: string | null | JSXMemberExpression | JSXIdentifier,
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
    const children = this.recombineChildren(content, acceptBr);

    scope.ensure("$pragma", "default", "React");

    return jsxElement(
      jsxOpeningElement(type, props),
      jsxClosingElement(type),
      children,
      children.length > 0
    )
  }

  private recombineChildren(
    input: ContentLike[],
    acceptBr: boolean){

    const output = [] as JSXContent[];

    for(const child of input)
      if(isTemplateLiteral(child))
        output.push(...templateToMarkup(child, acceptBr));
      else 
        output.push(this.normalize(child));

    return output;
  }

  private normalize(child: ContentLike){
    return (
      isJSXElement(child) ?
        child :
      isStringLiteral(child) && !/\{/.test(child.value) ?
        jsxText(child.value) :
      isExpression(child) ?
        jsxExpressionContainer(child) :
      "toExpression" in child ?
        jsxExpressionContainer(child.toExpression(this)) :
      this.element(child)
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