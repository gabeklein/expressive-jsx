import { Expression, TemplateElement, TemplateLiteral } from '@babel/types';

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