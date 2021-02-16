import { callExpression, expressionStatement, stringLiteral } from '@babel/types';
import { ExplicitStyle } from 'handle';
import { hash } from 'shared';
import { _get, _template } from 'syntax';

import type { Expression } from '@babel/types';
import type { Modifier } from 'handle/modifier';
import type { StackFrame } from 'context';
import type { BabelState, BunchOf } from 'types';

export function printStyles(state: BabelState<StackFrame>){
  const { modifiersDeclared, Imports } = state.context;

  if(!modifiersDeclared.size)
    return;
  
  const media = organizeStyle(modifiersDeclared);
  const styles = createSyntax(media, true);

  const args: Expression[] = [ _template(styles) ];
  const fileId = state.opts.hot !== false && hash(state.filename, 10);
  const runtime = Imports.ensure("$runtime", "default", "Styles");

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

function organizeStyle(
  modifiersDeclared: Set<Modifier>){

  const media: BunchOf<MediaGroups> = {
    default: []
  };

  for(let block of modifiersDeclared){
    const { priority = 0 } = block;

    const query = undefined;

    const targetQuery: MediaGroups =
      query === undefined ?
        media.default :
      query in media ?
        media[query] :
        media[query] = [];

    const targetPriority: SelectorContent =
      priority in targetQuery ?
        targetQuery[priority] :
        targetQuery[priority] = [];

    const items = [] as ExplicitStyle[];

    for(const item of block.sequence)
      if(item instanceof ExplicitStyle && item.invariant)
        items.push(item);

    const styles = items.map(style => {
      let styleKey = style.name;

      if(typeof styleKey == "string")
        styleKey = styleKey.replace(/([A-Z]+)/g, "-$1").toLowerCase();

      const line = `${styleKey}: ${style.value}`;

      if(style.important)
        return `${line} !important`;

      return line;
    })

    let selection = "";
    do {
      let select = block.forSelector!.join("");
      if(selection)
        select += " " + selection;
      selection = select;
    }
    while(block = block.onlyWithin!);

    targetPriority.push([selection, styles])
  }

  return media;
}

function createSyntax(
  media: BunchOf<MediaGroups>,
  pretty: boolean
){
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