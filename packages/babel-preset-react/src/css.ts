import { Define, hash, ModifyDelegate, Options, pascalToDash, Style, t } from '@expressive/babel-plugin-jsx';

import type { PluginObj, types as $ } from '@babel/core';

export function addStyle(this: ModifyDelegate, ...args: any[]){
  this.addStyle(this.name, ...args);
}

export const CSS = (_compiler: any, options: Options = {}): PluginObj => {
  const {
    hot = true,
    extractCss,
    cssModule,
    printStyle
  } = options;
  
  return {
    visitor: {
      Program: {
        exit(path: any){
          const {
            file,
            filename,
            module,
            program,
            declared
          } = path.data.context;
        
          const stylesheet = generateCSS(declared, printStyle == "pretty");
        
          if(stylesheet)
            if(extractCss){
              if(cssModule === false)
                extractCss(stylesheet);
              else {
                const cssModulePath = extractCss(stylesheet);
                const style = file.ensureUIDIdentifier("css");
                file.ensure(cssModulePath, "default", style);
              }
            }
            else {
              const args: $.Expression[] = [];
              const config: any = {};
            
              if(hot)
                config.refreshToken = t.literal(hash(filename, 10));
            
              if(module)
                config.module = t.literal(module);
            
              if(Object.keys(config).length)
                args.push(t.object(config));
        
              program.pushContainer("body", [
                t.statement(
                  t.call(
                    file.ensure("$runtime", "default", "css"),
                    t.template(`\n${stylesheet.replace(/^/gm, "\t")}\n`),
                    ...args
                  )
                )
              ]);
            }
        }
      }
    }
  }
}

type SelectorContent = [string[], Style[]][];
type MediaGroups = SelectorContent[];

function generateCSS(declared: Set<Define>, pretty?: boolean){
  if(declared.size == 0)
    return "";
  
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