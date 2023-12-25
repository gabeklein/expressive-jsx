import { Define, hash, ModifyDelegate, Options, pascalToDash, Style, t } from '@expressive/babel-plugin-jsx';

import type { PluginObj, types as $ } from '@babel/core';

const RUNTIME = require.resolve("../polyfill");

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
            declared,
            file,
            filename,
            module
          } = path.data.context;
        
          const stylesheet = generateCSS(declared, printStyle == "pretty");
        
          if(!stylesheet)
            return;

          if(extractCss){
            const cssModulePath = extractCss(stylesheet);

            if(cssModule !== false){
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
      
            path.pushContainer("body", [
              t.statement(
                t.call(
                  file.ensure(RUNTIME, "css"),
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

type SelectorContent = Define[];
type MediaGroups = SelectorContent[];

function generateCSS(declared: Set<Define>, pretty?: boolean){
  if(declared.size == 0)
    return "";
  
  const media: Record<string, MediaGroups> = { default: [] };

  for(const item of declared){
    let { priority = 0 } = item;

    for(let x=item.container; x;)
      if(x = x.container)
        priority += 0.1;

    const query = media["default"];
    const group =
      priority in query ?
        query[priority] :
        query[priority] = [];

    group.push(item);
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

      for(const item of group[priority])
        lines.push(...printStyles(item, pretty));
    }
  }

  return lines.join("\n");
}

function printStyles(item: Define, pretty?: boolean){
  const lines: string[] = [];

  const select = item.selector.map(select => {
    const selection = [select];

    for(let x: Define | undefined = item; x = x.within;)
      selection.unshift(x.selector[0]);

    return selection.join(" ");
  });
  
  const styles = item.sequence
    .filter(x => x instanceof Style && x.invariant) as Style[];

  const rules = styles.map(style => {
    let styleKey = style.name;

    if(typeof styleKey == "string")
      styleKey = pascalToDash(styleKey);

    let line = `${styleKey}: ${style.value}`;

    if(style.important)
      line += " !important";

    if(pretty)
      line = '\t' + line;
    
    return `${line};`;
  });

  if(pretty){
    const final = select.pop();

    for(const alternate of select)
      lines.push(alternate + ",");

    lines.push(`${final} {`, ...rules, "}");
  }
  else
    lines.push(`${select} { ${rules.join(' ')} }`);

  return lines;
}