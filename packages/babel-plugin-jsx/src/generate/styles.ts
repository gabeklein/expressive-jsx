import { Style } from 'handle/attributes';
import * as t from 'syntax';
import { hash } from 'utility';

import type { Context } from 'context';
import type { Define } from 'handle/definition';

type SelectorContent = [ string, Style[] ][];
type MediaGroups = SelectorContent[];

export function styleDeclaration(css: string, context: Context){
  const { filename, module, file, options } = context;

  const hot = options.hot !== false;
  const args: t.Expression[] = [];
  const config: any = {};

  if(hot)
    config.refreshToken = t.literal(hash(filename, 10));

  if(module)
    config.module = t.literal(module);

  if(Object.keys(config).length)
    args.push(t.object(config));

  return (
    t.statement(
      t.call(
        file.ensure("$runtime", "default", "css"),
        t.template(`\n${css.replace(/^/gm, "\t")}\n`),
        ...args
      )
    )
  );
}

export function generateCSS(context: Context){
  const { declared, options } = context;

  if(declared.size == 0)
    return "";
  
  const pretty = options.printStyle == "pretty";

  const media: Record<string, MediaGroups> = { default: [] };

  for(const item of declared){
    let { priority = 0 } = item;

    for(let x=item.container; x;)
      if(x = x.container)
        priority += 0.1;

    const query = "default";
    const selector = item.selector.map(select => {
      const selection = [select];
      let source: Define | undefined = item;

      while(source = source.within)
        selection.unshift(source.selector[0]);

      return selection.join(" ");
    });

    const styles = [] as Style[];

    for(const style of item.sequence)
      if(style instanceof Style && style.invariant)
        styles.push(style);

    const targetQuery: MediaGroups =
      query in media ?
        media[query] :
        media[query] = [];

    const group =
      priority in targetQuery ?
        targetQuery[priority] :
        targetQuery[priority] = [];

    group.push([
      selector.join(", "),
      styles
    ])
  }

  const lines: string[] = [];

  for(const query in media){
    const group = media[query];
    const index = Object
      .keys(group)
      .map(Number)
      .sort((a, b) => a - b);

    for(const priority of index){
      if(!pretty)
        lines.push(`/* ${
          priority.toFixed(1).replace(/\.0$/, "")
        } */`);

      for(const block of group[priority])
        lines.push(...printStyles(block, pretty));
    }
  }

  return lines.join("\n");
}

function printStyles(groups: [string, Style[]], pretty?: boolean){
  const [ select, styles ] = groups;
  const lines: string[] = [];

  const rules = styles.map(style => {
    let styleKey = style.name;

    if(typeof styleKey == "string")
      styleKey = styleKey.replace(/([A-Z]+)/g, "-$1").toLowerCase();

    let line = `${styleKey}: ${style.value}`;

    if(style.important)
      line += " !important";
    
    return line;
  });

  if(pretty){
    const selects = select.split(", ");
    const final = selects.pop();

    for(const alternate of selects)
      lines.push(alternate + ",");

    lines.push(
      final + " {",
      ...rules.map(x => `\t${x};`),
      "}"
    );
  }
  else {
    const block = rules.join("; ");

    lines.push(`${select} { ${block} }`)
  }

  return lines;
}