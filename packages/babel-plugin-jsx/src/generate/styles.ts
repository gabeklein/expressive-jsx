import { Style } from 'handle/attributes';
import { t } from 'syntax';
import { hash, pascalToDash } from 'utility';

import type * as $ from 'types';
import type { Context } from 'context';
import type { Define } from 'handle/definition';

type SelectorContent = [string[], Style[]][];
type MediaGroups = SelectorContent[];

export function applyCSS(context: Context){
  const {
    file,
    program,
    options: {
      extractCss,
      cssModule
    }
  } = context;

  const stylesheet = generateCSS(context);

  if(stylesheet)
    if(extractCss){
      if(cssModule === false)
        extractCss(stylesheet);
      else {
        const cssModulePath = extractCss(stylesheet);
        const style = context.ensureUIDIdentifier("css");
        file.ensure(cssModulePath, "default", style);
      }
    }
    else
      program.pushContainer("body", [
        runtimeStyle(stylesheet, context)
      ]);
}

function runtimeStyle(css: string, context: Context){
  const { filename, module, file, options } = context;

  const hot = options.hot !== false;
  const args: $.Expression[] = [];
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

function generateCSS(context: Context){
  const { declared, options } = context;

  if(declared.size == 0)
    return "";
  
  const pretty = options.printStyle == "pretty";
  const media: Record<string, MediaGroups> = { default: [] };

  for(const item of declared){
    let { priority = 0, sequence, selector } = item;

    for(let x=item.container; x;)
      if(x = x.container)
        priority += 0.1;

    const query = media["default"];
    const group =
      priority in query ?
        query[priority] :
        query[priority] = [];

    const styles = sequence.filter(x => x instanceof Style && x.invariant) as Style[];
    const select = selector.map(select => {
      const selection = [select];

      for(let x: Define | undefined = item; x = x.within;)
        selection.unshift(x.selector[0]);

      return selection.join(" ");
    });

    group.push([select, styles]);
  }

  const lines: string[] = [];

  for(const query in media){
    const group = media[query];
    const index = Object.keys(group).map(Number).sort((a, b) => a - b);

    for(const priority of index){
      if(!pretty)
        lines.push(`/* ${
          priority.toFixed(1).replace(/\.0$/, "")
        } */`);

      for(const [select, styles] of group[priority])
        lines.push(...printStyles(select, styles, pretty));
    }
  }

  return lines.join("\n");
}

function printStyles(select: string[], styles: Style[], pretty?: boolean){
  const lines: string[] = [];

  const rules = styles.map(style => {
    let styleKey = style.name;

    if(typeof styleKey == "string")
      styleKey = pascalToDash(styleKey);

    let line = `${styleKey}: ${style.value}`;

    if(style.important)
      line += " !important";
    
    return `${line};`;
  });

  if(pretty){
    const final = select.pop();

    for(const alternate of select)
      lines.push(alternate + ",");

    lines.push(
      `${final} {`,
      ...rules.map(x => '\t' + x),
      "}"
    );
  }
  else
    lines.push(`${select} { ${rules.join(' ')} }`)

  return lines;
}