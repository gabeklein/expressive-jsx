import { NodePath, PluginObj, template } from '@babel/core';
import { ExpressionStatement, Function, Identifier } from '@babel/types';
import { Context, getUsing } from '@expressive/babel-plugin-jsx';

import { Preset, State } from '..';
import t from '../types';
import { getComponentProp, getComponentProps } from './component';
import { addClassName, fixTagName, getClassName, hasProp, spreadProps } from './jsx';
import { uniqueIdentifier } from './uniqueIdentifier';

const classNamesHelper = template.ast`
  (...args) => args.filter(Boolean).join(" ");
` as ExpressionStatement;

export function CSSPlugin(
  _compiler: any, options: Preset.Options = {}): PluginObj<State> {

  const { cssModule } = options;
  let getHelper: () => Identifier;

  return {
    visitor: {
      JSXElement(path, state) {
        const { cssModuleId } = state.file.metadata;

        const using = getUsing(path);

        fixTagName(path);

        if (!using.size)
          return;

        let forward: NodePath<Function> | undefined;

        for (const define of using) {
          const className = getClassName(define, cssModuleId);

          if (className)
            addClassName(path, className, getHelper);

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
            addClassName(path, getComponentProp(path, "className"), getHelper);
        }
      },
      Program: {
        enter(path, state) {
          const { metadata } = state.file;

          getHelper = () => {
            let helper = state.classNameHelper as Identifier;

            if(!helper){
              helper = state.classNameHelper = uniqueIdentifier(path.scope, "classNames")
              path.unshiftContainer("body", 
                t.variableDeclaration("const", [
                  t.variableDeclarator(helper, classNamesHelper.expression)
                ])
              );
            }
              
            return helper;
          }

          if (cssModule)
            Object.defineProperty(metadata, "cssModuleId", {
              value: uniqueIdentifier(path.scope, "css")
            });

          Object.defineProperties(state.file.metadata, {
            styles: {
              value: new Map<string, Context>()
            },
            css: {
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
    .sort((d1, d2) => {
      const diff = depth(d1) - depth(d2);

      return diff === 0 ? 1 : diff;
    })
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
          value.slice(1).replace(/([A-Z]+)/g, "-$1").toLowerCase()
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