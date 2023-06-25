import * as t from 'syntax';
import { hash } from 'utility';

import type { RootContext } from './context';
import type { Define } from './define';

type Style = { name: string, value: string };

type SelectorContent = [ string, Style[] ][];
type MediaGroups = SelectorContent[];

export function styleDeclaration(css: string, context: RootContext){
  const { filename, file, options } = context;

  const hot = options.hot !== false;
  const args: t.Expression[] = [];
  const config: any = {};

  if(hot)
    config.refreshToken = t.literal(hash(filename, 10));

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

export function generateCSS(context: RootContext){
  const declared = Array
    .from(context.modifiersDeclared)
    .filter(item => item.className);

  if(declared.length == 0)
    return "";
  
  const pretty = true;
  const media: Record<string, MediaGroups> = { default: [] };

  for(const item of declared){
    let { priority = 0, className } = item;

    if(!className)
      continue;

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

    Object.entries(item.styles).forEach(([ name, value ]) => {
      if(value)
        styles.push({ name, value });
    });

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

      for(const [ select, styles ] of group[priority]){
        const rules = styles.map(style => {
          const styleKey = style.name!.replace(/([A-Z]+)/g, "-$1").toLowerCase();

          return `${styleKey}: ${style.value}`;
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
      }
    }
  }

  return lines.join("\n");
}