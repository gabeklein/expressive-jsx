import { BabelFileMetadata, BabelFileResult } from '@babel/core';

import * as Macros from './macros';
import { camelToDash } from './macros/util';
import Plugin from './plugin';
import { HTML_TAGS } from './syntax/tags';
import { t } from './types';

namespace Preset {
  export interface Options extends Plugin.Options {}
  export interface Meta extends BabelFileMetadata {
    css: string;
  }
  export interface Result extends BabelFileResult {
    metadata: Meta;
    code: string;
  }
}

function Preset(_compiler: any, options: Preset.Options = {} as any): any {
  Object.assign(t, _compiler.types);

  let { macros = [], ...opts } = options;
  const styles = new Set<Plugin.DefineContext>();

  return {
    plugins: [
      [Plugin, <Plugin.Options>{
        ...opts,
        macros: [
          Macros,
          ...macros
        ],
        apply(element){
          const {
            using,
            this: component,
            node: {
              openingElement: {
                name,
                attributes
              }
            }
          } = element;

          const used = new Set(using);

          if(t.isJSXIdentifier(name)
          && !/^[A-Z]/.test(name.name)
          && !HTML_TAGS.includes(name.name))
            element.setTagName("div");
       
          for(const define of used)
            if(define.className)
              element.addClassName(define.className);

          for(const context of used){
            context.dependant.forEach(x => used.add(x));
            styles.add(context);
          }

          if(component){
            attributes.unshift(
              t.jsxSpreadAttribute(component.getProps())
            )

            if(element.getProp("className"))
              element.addClassName(
                component.getProp("className")
              )
          }
        },
      }],
      [{
        visitor: {
          Program: {
            exit(path: any){
              path.hub.file.metadata.css = print(styles);
              styles.clear(); 
            }
          }
        }
      }]
    ]
  }
}

function print(styles: Iterable<Plugin.DefineContext>){
  const css = [] as string[];

  for(const context of styles){
    if(!Object.keys(context.styles).length)
      continue;

    const styles = [] as string[];

    for(const [name, value] of Object.entries(context.styles))
      styles.push(`  ${camelToDash(name)}: ${value};`);

    css.push(context.selector + " {\n" + styles.join("\n") + "\n}");
  }

  return css.join("\n");
}

export default Preset;