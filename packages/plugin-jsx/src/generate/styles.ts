import { ExplicitStyle } from 'handle/attributes';
import { hash } from 'utility';

import type * as t from 'syntax/types';
import type { StackFrame } from 'context';
import type { Define } from 'handle/definition';
import type { BunchOf } from 'types';
import * as $ from 'syntax';

type SelectorContent = [ string, string[] ][];
type MediaGroups = SelectorContent[];

export function styleDeclaration(context: StackFrame){
  const {
    filename,
    modifiersDeclared,
    module,
    program,
    opts
  } = context;

  const pretty = opts.printStyle == "pretty";
  const hot = opts.hot !== false;

  if(!modifiersDeclared.size)
    return;
  
  const mediaGroups = prioritize(modifiersDeclared);
  const printedStyle = serialize(mediaGroups, pretty);
  const args: t.Expression[] = [];
  const options: any = {};

  if(hot)
    options.refreshToken = $.literal(hash(filename, 10));

  if(opts.module)
    options.module = $.literal(
      typeof opts.module == "string"
        ? opts.module
        : module && module.name || true
    );

  if(Object.keys(options).length)
    args.push($.object(options));

  return (
    $.statement(
      $.call(
        program.ensure("$runtime", "default", "css"),
        $.template(printedStyle),
        ...args
      )
    )
  );
}

function prioritize(source: Set<Define>){
  const media: BunchOf<MediaGroups> = {
    default: []
  };

  for(const item of source){
    let { priority = 0 } = item;

    for(let x=item.container; x;)
      if(x = x.container)
        priority += 0.1;

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

  for(const query in media)
    Object.entries(media[query])
      .sort((a, b) => {
        return a[0] > b[0] ? 1 : -1;
      })
      .forEach(([index, bunch]) => {
        if(!pretty)
          lines.push(`/* ${
            Number(index).toFixed(1).replace(/\.0$/, "")
          } */`);

        for(const [ name, styles ] of bunch){
          if(pretty){
            const rules = styles.map(x => `\t${x};`);
            const select = name.split(", ");
            const final = select.pop();

            for(const alternate of select)
              lines.push(alternate + ",");

            lines.push(final + " { ", ...rules, "}");
          }
          else {
            const block = styles.join("; ");

            lines.push(`${name} { ${block} }`)
          }
        }
      });

  const content = lines.map(x => "\t" + x).join("\n")

  return `\n${content}\n`;
}

function buildSelector(target: Define){
  return target.selector
    .map(select => {
      const selection = [select];
      let source: Define | undefined = target;

      while(source = source.within)
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