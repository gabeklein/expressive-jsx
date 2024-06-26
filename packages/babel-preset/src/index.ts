import { BabelFileMetadata, BabelFileResult, NodePath } from '@babel/core';
import { Expression, Function } from '@babel/types';

import { Context } from './context';
import * as Macros from './macros';
import { camelToDash } from './macros/util';
import Plugin from './plugin';
import { componentProp, componentProps } from './syntax/component';
import { addClassName, hasProp, setTagName, spreadProps } from './syntax/jsx';
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

  const styles = new Set<Context>();
  let polyfill = options.polyfill;

  if(polyfill === undefined)
    polyfill = require.resolve("../polyfill");

  return {
    plugins: [
      [Plugin, <Plugin.Options>{
        ...options,
        macros: [
          Macros,
          ...options.macros || []
        ],
        apply(path, using){
          const used = new Set(using);

          let thisComponent: NodePath<Function> | undefined;
       
          for(const define of used){
            const className = getClassName(define);

            if(className)
              addClassName(path, className, polyfill);

            if(define.path.isFunction())
              thisComponent = define.path;
          }

          for(const context of used){
            context.children.forEach(x => used.add(x));
            styles.add(context);
          }

          if(thisComponent){
            spreadProps(path, componentProps(thisComponent));

            if(hasProp(path, "className"))
              addClassName(path, componentProp(path, "className"), polyfill)
          }

          fixTagName(path);
        },
      }],
      [{
        visitor: {
          Program: {
            exit(path: any, state: any){
              state.file.metadata.css = Array
                .from(styles)
                .filter(isInUse)
                .sort(byPriority)
                .map(toCss)
                .join("\n");
    
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

function getClassName(context: Context): Expression | undefined {
  if(!context.props.size && !context.children.size)
    return;

  const { condition, alternate, uid } = context;

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

function isInUse(context: Context){
  return context.props.size > 0;
}

function byPriority(a: Context, b: Context){
  return depth(a) - depth(b);
}

function toCss(context: Context){
  const css = [] as string[];

  for(let [name, value] of context.props)
    css.push("  " + toCssProperty(name, value));

  const select = toSelector(context);
  const style = css.join("\n");
    
  return `${select} {\n${style}\n}`
}

function toCssProperty(name: string, value: any){
  const property = name
    .replace(/^\$/, "--")
    .replace(/([A-Z]+)/g, "-$1")
    .toLowerCase();

  if(Array.isArray(value))
    value = value.map(value => {
      if(value.startsWith("$"))
        return `var(--${
          camelToDash(value.slice(1))
        })`;

      return value;
    })

  return `${property}: ${value};`;
}

function toSelector(context: Context): string {
  let { parent, condition, uid } = context;

  if(typeof condition === "string")
    return toSelector(context.parent!) + condition;

  let selector = "";

  while(parent){
    if(parent instanceof Context && parent.condition){
      selector = toSelector(parent) + " ";
      break;
    }
    parent = parent.parent;
  }

  return selector += "." + uid;
}

function depth(context: Context){
  let depth = 0;

  do {
    if(context.path.isFunction())
      break;
    else
      depth += /^[A-Z]/.test(context.uid) ? 2 : 1;
  }
  while(context = context.parent!)

  return depth;
}

export default Preset;