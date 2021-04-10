import { callExpression, expressionStatement, stringLiteral } from '@babel/types';
import { ExplicitStyle } from 'handle';
import { hash } from 'shared';
import { _get, _template } from 'syntax';

import type { Expression } from '@babel/types';
import type { Define } from 'handle/modifier';
import type { StackFrame } from 'context';
import type { BabelState, BunchOf } from 'types';

export function printStyles(state: BabelState<StackFrame>){
  const { modifiersDeclared, Imports, opts } = state.context;
  const pretty = opts.printStyle == "pretty";

  if(!modifiersDeclared.size)
    return;
  
  const styles = new Printer(modifiersDeclared).print(pretty);
  const fileId = state.opts.hot !== false && hash(state.filename, 10);
  const runtime = Imports.ensure("$runtime", "default", "Styles");
  const args: Expression[] = [ _template(styles) ];

  if(fileId)
    args.push(stringLiteral(fileId));

  return expressionStatement(
    callExpression(
      _get(runtime, "include"), args
    )
  );
}

type SelectorContent = [ string, string[] ][];
type MediaGroups = SelectorContent[];

class Printer {
  media: BunchOf<MediaGroups> = {
    default: []
  }

  constructor(source: Set<Define>){
    for(let item of source){
      const group = this.getPlacement(item);
      const selector = buildSelector(item);
      const styles = generateBlock(item);

      group.push([ selector, styles ])
    }
  }

  print(pretty?: boolean){
    const { media } = this;
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

    return `\n${content}\n`
  }

  getPlacement(target: Define){
    const { media } = this;
    const { priority = 0 } = target;
  
    const query = undefined;

    const targetQuery: MediaGroups =
      query === undefined ?
        media.default :
      query in media ?
        media[query] :
        media[query] = [];

    return priority in targetQuery ?
      targetQuery[priority] :
      targetQuery[priority] = [];
  }
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

function generateBlock(target: Define){
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