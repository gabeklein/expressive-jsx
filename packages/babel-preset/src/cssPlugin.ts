import { NodePath, PluginObj } from '@babel/core';
import { Function, Identifier } from '@babel/types';

import { Preset, State } from '.';
import { getComponentProp, getComponentProps } from './helper/component';
import { addClassName, fixTagName, getClassName, hasProp, spreadProps } from './helper/jsx';
import { uniqueIdentifier } from './helper/uniqueIdentifier';
import { camelToDash } from './helper/util';
import { Context, getUsing } from './parsePlugin';
import t from './types';

export function CSSPlugin(
  _compiler: any, options: Preset.Options = {}): PluginObj<State> {

  const { cssModule } = options;

  let cssObject: Identifier | undefined;

  return {
    visitor: {
      JSXElement(path, state) {
        const using = getUsing(path);

        if (!using.size)
          return;

        let forward: NodePath<Function> | undefined;

        for (const define of using) {
          const className = getClassName(define, cssObject);

          if (className)
            addClassName(path, className, options);

          if (define.path.isFunction())
            forward = define.path;
        }

        for (const context of using) {
          const { styles } = state.file.metadata as Preset.MetaData;
          const key = toSelector(context);

          context.children.forEach(x => using.add(x));
          styles.set(key, context);
        }

        if (forward) {
          spreadProps(path, getComponentProps(forward));

          if (hasProp(path, "className"))
            addClassName(path, getComponentProp(path, "className"), options);
        }

        fixTagName(path);
      },
      Program: {
        enter(path, state) {
          if (cssModule)
            cssObject = uniqueIdentifier(path.scope, "css");

          Object.defineProperties(state.file.metadata, {
            styles: {
              enumerable: true,
              value: new Map<string, Context>()
            },
            css: {
              enumerable: true,
              get(this: Preset.MetaData) {
                return Array
                  .from(this.styles.values())
                  .filter(isInUse)
                  .sort(byPriority)
                  .map(toCss)
                  .join("\n");
              }
            }
          });
        },
        exit(path, state) {
          const { styles } = state.file.metadata;

          if (!cssObject || !cssModule || !styles.size)
            return;

          path.unshiftContainer("body", t.importDeclaration(
            [t.importDefaultSpecifier(cssObject)],
            t.stringLiteral(cssModule)
          ));
        }
      }
    },
  };
}

export function isInUse(context: Context){
  return context.props.size > 0;
}

export function byPriority(a: Context, b: Context){
  return depth(a) - depth(b);
}

export function toCss(context: Context){
  const css = [] as string[];

  for(let [name, value] of context.props)
    css.push("  " + toCssProperty(name, value));

  const select = toSelector(context);
  const style = css.join("\n");
    
  return `${select} {\n${style}\n}`
}

export function toSelector(context: Context): string {
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

function toCssProperty(name: string, value: any){
  const property = name
    .replace(/^\$/, "--")
    .replace(/([A-Z]+)/g, "-$1")
    .toLowerCase();

  if(Array.isArray(value))
    value = value.map(value => {
      if(typeof value == "string" && /^\$/.test(value))
        return `var(--${
          camelToDash(value.slice(1))
        })`;

      return value;
    })

  return `${property}: ${value.join(" ")};`;
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