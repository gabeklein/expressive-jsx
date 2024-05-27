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

  return {
    visitor: {
      JSXElement(path, state) {
        const { cssModuleId } = state.file.metadata;

        const using = getUsing(path);

        if (!using.size)
          return;

        let forward: NodePath<Function> | undefined;

        for (const define of using) {
          const className = getClassName(define, cssModuleId);

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
          const { metadata } = state.file;

          if (cssModule)
            Object.defineProperty(metadata, "cssModuleId", {
              value: uniqueIdentifier(path.scope, "css")
            });

          Object.defineProperties(state.file.metadata, {
            styles: {
              enumerable: true,
              value: new Map<string, Context>()
            },
            css: {
              enumerable: true,
              get(this: Preset.MetaData) {
                return toStylesheet(this.styles.values());
              }
            }
          });
        },
        exit(path, state) {
          const { styles, cssModuleId } = state.file.metadata;

          if (!cssModuleId || !cssModule || !styles.size)
            return;

          path.unshiftContainer("body", t.importDeclaration(
            [t.importDefaultSpecifier(cssModuleId)],
            t.stringLiteral(cssModule)
          ));
        }
      },
    },
  };
}

function toStylesheet(contexts: Iterable<Context>){
  return Array
    .from(contexts)
    .filter(d => d.props.size > 0)
    .sort((d1, d2) => depth(d1) - depth(d2))
    .map(define => {
      const css = [] as string[];
    
      for(let [name, value] of define.props)
        css.push("  " + toCssProperty(name, value));
    
      const select = toSelector(define);
      const style = css.join("\n");
        
      return `${select} {\n${style}\n}`
    })
    .join("\n");
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