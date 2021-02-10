import {
  Expression,
  jsxElement,
  jsxExpressionContainer,
  jsxIdentifier,
  isJSXElement,
  jsxOpeningElement,
  jsxText,
  stringLiteral,
  TemplateElement,
  TemplateLiteral,
} from '@babel/types';
import { JSXContent } from 'types';

export function templateToMarkup(
  node: TemplateLiteral,
  acceptBr: boolean){

  const { expressions, quasis } = node;
  let acc = [] as JSXContent[];
  let i = 0;

  while(true) {
    const value = quasis[i].value.cooked as string;

    if(value)
      if(/\n/.test(value))
        return acceptBr
          ? recombineMultilineJSX(node)
          : [ jsxExpressionContainer(dedent(node)) ]
      else 
        acc.push(
          /[{}]/.test(value)
            ? jsxExpressionContainer(stringLiteral(value))
            : jsxText(value)
        )

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

    if(isJSXElement(chunk))
      return chunk;

    return jsxExpressionContainer(chunk)
  })
}

export function dedent(quasi: TemplateLiteral){
  const { quasis } = quasi;
  const starting_indentation = /^\n( *)/.exec(quasis[0].value.cooked!);
  const INDENT = starting_indentation && new RegExp("\n" + starting_indentation[1], "g");
  let i = 0;

  for(const { value } of quasis){
    let text = value.cooked!;
    if(INDENT)
      text = text.replace(INDENT, "\n");
    if(i === 0)
      text = text.replace("\n", "")
    if(i === quasis.length - 1)
      text = text.replace(/\s*\n*$/, "")

    value.cooked = text;
    value.raw = text.replace(/\n/g, "\\n")

    i++;
  }

  return quasi;
}

export function breakdown(quasi: TemplateLiteral){
  const { quasis, expressions } = quasi;
  const starting_indentation = /^\n( *)/.exec(quasis[0].value.cooked!);
  const INDENT = starting_indentation && new RegExp("\n" + starting_indentation[1], "g");
  const acc = [] as Array<string | Expression>
  let i = 0;

  while(true){
    let text: string | Array<any> = quasis[i].value.raw as string;
    if(INDENT)
      text = text.replace(INDENT, "\n");
    if(i === 0)
      text = text.replace("\n", "")
    if(i === quasis.length - 1)
      text = text.replace(/\s*\n*$/, "")

    let chunks: any[] = text.split("\n");
    for(const chunk of chunks){
      if(chunk !== "")
        acc.push(chunk)
      acc.push("\n")
    }
    acc.pop();

    const expression = expressions[i++];
    if(expression)
      acc.push(expression);
    else break
  }

  return acc;
}

export function breakForString(
  quasi: TemplateElement,
  then: Expression,
  items: any[],
  INDENT: RegExp | null,
  i: number,
  length: number ){

  for(let x of ["raw", "cooked"] as const){
    let text = quasi.value[x]!;
    if(INDENT) text = text.replace(INDENT, "\n");
    if(i == 0) text = text.replace("\n", "")
    if(i == length - 1)
      text = text.replace(/\s+$/, "")
    quasi.value[x] = text
  }
}