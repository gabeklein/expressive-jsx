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
  jsxIdentifier,
  jsxOpeningElement,
  jsxSpreadAttribute,
  jsxText,
  stringLiteral,
  TemplateLiteral,
} from '@babel/types';
import { ElementReact, GenerateReact } from 'internal';
import { breakdown, dedent } from 'regenerate/quasi';
import { ContentLike, IsLegalAttribute, JSXContent, PropData } from 'types';

export class GenerateJSX extends GenerateReact {

  get Fragment(){
    const Fragment = jsxIdentifier(
      this.external.ensure("$pragma", "Fragment").name
    );
    Object.defineProperty(this, "Fragment", { configurable: true, value: Fragment })
    return Fragment;
  }

  willExitModule(){
    if(this.module.lastInsertedElement)
      this.external.ensure("$pragma", "default", "React")
  }

  element(src: ElementReact){
    const {
      tagName: tag,
      props,
      children
    } = src;

    const type = jsxIdentifier(tag);
    const properties = props.map(this.recombineProps)
    const empty = children.length === 0
    const acceptBr = /[a-z]/.test(tag[0]);

    return jsxElement(
      jsxOpeningElement(type, properties, empty),
      jsxClosingElement(type),
      this.recombineChildren(children, acceptBr),
      empty
    )
  }

  fragment(
    children = [] as ContentLike[],
    key?: Expression | false
  ){
    const attributes = !key ? [] : [
      jsxAttribute(
        jsxIdentifier("key"),
        jsxExpressionContainer(key)
      )
    ]

    return jsxElement(
      jsxOpeningElement(this.Fragment, attributes),
      jsxClosingElement(this.Fragment),
      this.recombineChildren(children, true),
      false
    )
  }

  private recombineChildren(
    input: ContentLike[],
    acceptBr: boolean){

    const output = [] as JSXContent[];
    for(const child of input){
      let jsx;

      if(isJSXElement(child))
        jsx = child
      else if(isExpression(child)){
        if(isTemplateLiteral(child)){
          output.push(...this.recombineQuasi(child, acceptBr))
          continue
        }
        if(isStringLiteral(child) && child.value.indexOf("{") < 0)
          jsx = jsxText(child.value)
        else
          jsx = jsxExpressionContainer(child);
      }
      else {
        jsx = "toExpression" in child
          ? jsxExpressionContainer(child.toExpression(this))
          : this.element(child)
      }

      output.push(jsx);
    }

    return output;
  }

  private recombineQuasi(
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
            return this.recombineMultilineJSX(node);
          else
            return [
              jsxExpressionContainer(
                dedent(node)
              )
            ]
        else if(/[{}]/.test(value))
          jsxExpressionContainer(
            stringLiteral(value))
        else
          text = jsxText(value);

        acc.push(text!)
      }

      if(i in expressions)
        acc.push(
          jsxExpressionContainer(
            expressions[i++]))
      else break;
    }

    return acc;
  }

  private recombineMultilineJSX(
    node: TemplateLiteral
  ): JSXContent[] {
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

  private recombineProps({ name, value }: PropData){
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
}