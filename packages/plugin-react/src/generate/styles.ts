import { ExplicitStyle } from 'handle/attributes';
import * as t from 'syntax';

import type { StackFrame } from 'context';
import type { Define } from 'handle/definition';
import type { Expression } from 'syntax';
import type { BunchOf } from 'types';

type SelectorContent = [ string, string[] ][];
type MediaGroups = SelectorContent[];

export function styleDeclaration(
  context: StackFrame,
  argument: Expression | undefined){

  const { modifiersDeclared, program, opts } = context;
  const pretty = opts.printStyle == "pretty";

  if(!modifiersDeclared.size)
    return;
  
  const runtime = program.ensure("$runtime", "default", "Styles");
  const mediaGroups = prioritize(modifiersDeclared);
  const printedStyle = serialize(mediaGroups, pretty);
  const args = [ t.template(printedStyle) as Expression ];

  if(argument)
    args.push(argument);

  return t.expressionStatement(
    t.callExpression(
      t.get(runtime, "include"), args
    )
  );
}

function prioritize(source: Set<Define>){
  const media: BunchOf<MediaGroups> = {
    default: []
  };

  for(let item of source){
    const { priority = 0 } = item;

    const query = "default";
    const selector = buildSelector(item);
    const styles = print(item);

    const targetQuery: MediaGroups =
      query in media ?
        media[query] :
        media[query] = [];

    const group =
      priority in targetQuery ?
        targetQuery[priority] :
        targetQuery[priority] = [];

    group.push([ selector, styles ])
  }

  return media;
}

function serialize(
  media: BunchOf<MediaGroups>,
  pretty?: boolean){

  const lines = [];

  for(const query in media){
    const priorityBunches = media[query].filter(x => x);

    for(const bunch of priorityBunches)
      for(const [ name, styles ] of bunch){
        if(pretty){
          const rules = styles.map(x => `\t${x};`);
          lines.push(name + " { ", ...rules, "}")
        }
        else {
          const block = styles.join("; ");
          lines.push(`${name} { ${block} }`)
        }
      }
  }

  const content = lines.map(x => "\t" + x).join("\n")

  return `\n${content}\n`;
}

function buildSelector(target: Define){
  let selection = "";

  do {
    let select = target.selector.join("");
    if(selection)
      select += " " + selection;
    selection = select;
  }
  while(target = target.onlyWithin!);

  return selection;
}

function print(target: Define){
  const items = [] as ExplicitStyle[];

  for(const item of target.sequence)
    if(item instanceof ExplicitStyle && item.invariant)
      items.push(item);

  return items.map(style => {
    let styleKey = style.name;

    if(typeof styleKey == "string")
      styleKey = styleKey.replace(/([A-Z]+)/g, "-$1").toLowerCase();

    const line = `${styleKey}: ${style.value}`;

    if(style.important)
      return `${line} !important`;

    return line;
  })
}