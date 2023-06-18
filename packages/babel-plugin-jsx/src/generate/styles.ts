import { Style } from 'handle/attributes';
import { hash } from 'utility';

import type * as t from 'syntax/types';
import type { StackFrame } from 'context';
import type { Define } from 'handle/definition';
import type { BunchOf } from 'types';
import * as $ from 'syntax';

type SelectorContent = [ string, Style[] ][];
type MediaGroups = SelectorContent[];

export function styleDeclaration(css: string, context: StackFrame){
  const { filename, module, program, opts } = context;

  const hot = opts.hot !== false;
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
        $.template(`\n${css.replace(/^(.)/gm, "\t$1")}\n`),
        ...args
      )
    )
  );
}

export function generateCSS(context: StackFrame){
  const { modifiersDeclared, opts } = context;

  if(modifiersDeclared.size == 0)
    return "";
  
  const pretty = opts.printStyle == "pretty";

  const media: BunchOf<MediaGroups> = { default: [] };

  for(const item of modifiersDeclared){
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