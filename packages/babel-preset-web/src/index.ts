import { BabelFileMetadata, BabelFileResult, NodePath } from '@babel/core';
import { Expression, Function } from '@babel/types';

import { Context } from './context/Context';
import { Define } from './context/Context';
import * as Macros from './macros';
import { camelToDash } from './macros/util';
import Plugin from './plugin';
import { getProp, getProps } from './syntax/component';
import { addClassName, hasProp, setTagName } from './syntax/jsx';
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
  const polyfill = options.polyfill || null;

  return {
    plugins: [
      [Plugin, <Plugin.Options>{
        ...options,
        macros: [
          Macros,
          ...options.macros || []
        ],
        apply(path, element){
          const opening = path.get("openingElement");
          const used = new Set(element.using);

          let thisComponent: NodePath<Function> | undefined;
       
          for(const define of used){
            const className = getClassName(define);

            if(className)
              addClassName(path, className, polyfill);

            if(define.path.isFunction())
              thisComponent = define.path;
          }

          for(const context of used){
            context.dependant.forEach(x => used.add(x));
            styles.add(context);
          }

          if(thisComponent){
            opening.unshiftContainer("attributes",
              t.jsxSpreadAttribute(getProps(thisComponent))
            )

            if(hasProp(path, "className"))
              addClassName(path, getProp(path, "className"), polyfill)
          }

          fixTagName(path);
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

/** TODO: Move to a default handler included with macros. */
function fixTagName(path: any){
  const { name } = path.get("openingElement").node;

  if(t.isJSXIdentifier(name)
  && !/^[A-Z]/.test(name.name)
  && !HTML_TAGS.includes(name.name))
    setTagName(path, "div");
}

function getClassName(context: Plugin.Define): Expression | undefined {
  if(!context.props.size && !context.dependant.size)
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
    if(!context.props.size)
      continue;

    const styles = [] as string[];

    for(const [name, value] of context.props)
      styles.push(`  ${camelToDash(name)}: ${value};`);

    const style = styles.join("\n");
    const select = selector(context);

    css.push(`${select} {\n${style}\n}`);
  }

  return css.join("\n");
}

function selector(context: Define): string {
  const { condition, uid } = context;

  if(typeof condition === "string")
    return selector(context.parent as Define) + condition;

  let select = "";

  for(let parent = context.parent; parent; parent = parent.parent!)
    if(parent instanceof Define && parent.condition){
      select = selector(parent) + " ";
      break;
    }

  return select += "." + uid;
}

export default Preset;