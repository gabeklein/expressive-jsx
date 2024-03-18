import { BabelFileMetadata, BabelFileResult } from '@babel/core';

import * as Macros from './macros';
import { camelToDash } from './macros/util';
import Plugin from './plugin';
import { HTML_TAGS } from './syntax/tags';
import t from './types';
import { Context } from './context/Context';
import { Component } from './context/Component';

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

  const styles = new Set<Plugin.Define>();

  return {
    plugins: [
      [Plugin, <Plugin.Options>{
        ...options,
        macros: [
          Macros,
          ...options.macros || []
        ],
        apply(element){
          const { name, attributes } = element.path.node.openingElement;
          const used = new Set(element.using);
       
          for(const define of used)
            if(define.className)
              element.addClassName(define.className);

          for(const context of used){
            context.dependant.forEach(x => used.add(x));
            styles.add(context);
          }

          if(t.isJSXIdentifier(name)
          && !/^[A-Z]/.test(name.name)
          && !HTML_TAGS.includes(name.name))
            element.setTagName("div");

          let context: Context | undefined = element;

          while(context = context.parent)
            if(context instanceof Component){
              if(context.usedBy.has(element)){
                attributes.unshift(
                  t.jsxSpreadAttribute(context.getProps())
                )
    
                if(element.getProp("className"))
                  element.addClassName(
                    context.getProp("className")
                  )
              }

              break;
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

function print(styles: Iterable<Plugin.Define>){
  const css = [] as string[];

  for(const context of styles){
    if(context.empty)
      continue;

    const styles = [] as string[];

    for(const [name, value] of Object.entries(context.styles))
      styles.push(`  ${camelToDash(name)}: ${value};`);

    css.push(context.selector + " {\n" + styles.join("\n") + "\n}");
  }

  return css.join("\n");
}

export default Preset;