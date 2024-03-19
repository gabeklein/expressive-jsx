import { BabelFileMetadata, BabelFileResult } from '@babel/core';
import { Expression } from '@babel/types';

import { Context } from './context/Context';
import { Define } from './context/Define';
import * as Macros from './macros';
import { camelToDash } from './macros/util';
import Plugin from './plugin';
import { getProp, getProps } from './syntax/component';
import { HTML_TAGS } from './syntax/tags';
import t from './types';

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
       
          for(const define of used){
            const className = getClassName(define);

            if(className)
              element.addClassName(className);
          }

          for(const context of used){
            context.dependant.forEach(x => used.add(x));
            styles.add(context);
          }

          if(t.isJSXIdentifier(name)
          && !/^[A-Z]/.test(name.name)
          && !HTML_TAGS.includes(name.name))
            element.setTagName("div");

          let context: Context | undefined = element;

          while(context = context.parent){
            const path = context.path;
    
            if(context instanceof Define && path.isFunction()){
              if(context.usedBy.has(element)){
                attributes.unshift(
                  t.jsxSpreadAttribute(getProps(path))
                )
    
                if(element.getProp("className"))
                  element.addClassName(
                    getProp(path, "className")
                  )
              }

              break;
            }
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

function getClassName(context: Plugin.Define): Expression | undefined {
  if(context.empty && !context.dependant.size)
    return;

  const { condition, alternate, uid} = context;

  if(typeof condition == "string" || t.isStringLiteral(condition))
    return;

  const value = t.stringLiteral(uid);

  if(!condition)
    return value;

  if(alternate){
    let alt = getClassName(alternate);

    if(typeof alt === "string")
      alt = t.stringLiteral(alt);

    if(alt)
      return t.conditionalExpression(condition, value, alt);
  }

  return t.logicalExpression("&&", condition, value);
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