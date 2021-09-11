import { ExplicitStyle } from 'handle/attributes';
import * as t from 'syntax';
import { hash } from 'utility';

import type { StackFrame } from 'context';
import type { Define } from 'handle/definition';
import type { BunchOf } from 'types';

type SelectorContent = [ string, string[] ][];
type MediaGroups = SelectorContent[];

export function styleDeclaration(
  context: StackFrame,
  filename: string){

  const { modifiersDeclared, program, opts } = context;
  const pretty = opts.printStyle == "pretty";
  const hot = opts.hot !== false;

  if(!modifiersDeclared.size)
    return;
  
  const runtime = program.ensure("$runtime", "default", "CSS");
  const mediaGroups = prioritize(modifiersDeclared);
  const printedStyle = serialize(mediaGroups, pretty);
  const args = [ t.template(printedStyle) as t.Expression ];

  if(hot){
    const uid = hash(filename, 10);
    args.push(t.stringLiteral(uid));
  }

  return t.expressionStatement(
    t.callExpression(
      t.get(runtime, "put"), args
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

  const lines: string[] = [];

  for(const query in media){
    media[query].forEach((bunch, index) => {
      if(!pretty)
        lines.push(`/* ${index} */`)

      for(const [ name, styles ] of bunch){
        if(pretty){
          const select = name.split(", ");
          const final = select.pop();

          select.forEach(alternate => {
            lines.push(alternate + ",");
          });

          const rules = styles.map(x => `\t${x};`);
          lines.push(final + " { ", ...rules, "}");
        }
        else {
          const block = styles.join("; ");
          lines.push(`${name} { ${block} }`)
        }
      }
    });
  }

  const content = lines.map(x => "\t" + x).join("\n")

  return `\n${content}\n`;
}

function buildSelector(target: Define){
  return target.selector
    .map(select => {
      let selection = [select];
      let source = target;

      while(source = source.onlyWithin!)
        selection.unshift(source.selector[0]);

      return selection.join(" ");
    })
    .join(", ");
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