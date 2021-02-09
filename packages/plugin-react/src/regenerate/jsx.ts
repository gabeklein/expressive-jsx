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
  stringLiteral,
  TemplateLiteral,
} from '@babel/types';
import { breakdown, dedent, GenerateReact } from 'regenerate';
import { ElementReact } from 'translate';
import { ContentLike, IsLegalAttribute, JSXContent, PropData } from 'types';

export class GenerateJSX extends GenerateReact {
  element(src: ElementReact){
    const { tagName, props, children } = src;
    return this.createElement(tagName, props, children);
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
    const { Imports } = this;
    let type: JSXMemberExpression | JSXIdentifier;

    if(typeof tag == "string")
      type = jsxIdentifier(tag);
    else if(tag)
      type = tag;
    else
      type = jsxIdentifier(
        Imports.ensure("$pragma", "Fragment").name
      )

    if(acceptBr === undefined)
      acceptBr = typeof tag == "string" && /^[a-z]/.test(tag);

    const props = properties.map(createAttribute);
    const children = this.recombineChildren(content, acceptBr);

    Imports.ensure("$pragma", "default", "React");

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

    for(const child of input){
      if(isTemplateLiteral(child)){
        const jsx = templateToMarkup(child, acceptBr);
        output.push(...jsx);
      }
      else {
        let jsx: JSXContent;

        if(isJSXElement(child))
          jsx = child;
  
        else if(isStringLiteral(child) && !/\{/.test(child.value))
          jsx = jsxText(child.value);
  
        else if(isExpression(child))
          jsx = jsxExpressionContainer(child);
  
        else if("toExpression" in child)
          jsx = jsxExpressionContainer(child.toExpression(this));
  
        else
          jsx = this.element(child);

        output.push(jsx);
      }
    }

    return output;
  }
}

function createAttribute({ name, value }: PropData){
  if(typeof name !== "string")
    return jsxSpreadAttribute(value);
  else {
    if(IsLegalAttribute.test(name) == false)
      throw new Error(`Illegal characters in prop named ${name}`)

    const insertedValue =
      isStringLiteral(value)
        ? value.value == "true"
          ? null
          : value
        : jsxExpressionContainer(value)

    return jsxAttribute(
      jsxIdentifier(name),
      insertedValue
    )
  }
}

function templateToMarkup(
  node: TemplateLiteral,
  acceptBr: boolean){

  const { expressions, quasis } = node;
  let acc = [] as JSXContent[];
  let i = 0;

  while(true) {
    const value = quasis[i].value.cooked as string;

    if(value){
      let text: JSXContent | undefined;
      if(/\n/.test(value))
        if(acceptBr)
          return recombineMultilineJSX(node);
        else
          return [
            jsxExpressionContainer(dedent(node))
          ]
      else if(/[{}]/.test(value))
        jsxExpressionContainer(stringLiteral(value))
      else
        text = jsxText(value);

      acc.push(text!)
    }

    if(i in expressions)
      acc.push(
        jsxExpressionContainer(expressions[i++])
      )
    else
      break;
  }

  return acc;
}

function recombineMultilineJSX(node: TemplateLiteral): JSXContent[] {
  return breakdown(node).map(chunk => {
    if(chunk === "\n")
      return jsxElement(
        jsxOpeningElement(jsxIdentifier("br"), [], true),
        undefined, [], true
      )
    if(typeof chunk === "string")
      return chunk.indexOf("{") < 0
        ? jsxText(chunk)
        : jsxExpressionContainer(stringLiteral(chunk))

    else if(isJSXElement(chunk))
      return chunk

    else
      return jsxExpressionContainer(chunk)
  })
}