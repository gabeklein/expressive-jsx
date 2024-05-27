import { NodePath, PluginObj } from '@babel/core';
import { Function, Identifier } from '@babel/types';

import { Preset, State } from '.';
import { getComponentProp, getComponentProps } from './helper/component';
import { addClassName, fixTagName, getClassName, hasProp, spreadProps } from './helper/jsx';
import { Context, getUsing } from './plugin';
import { uniqueIdentifier } from './helper/uniqueIdentifier';
import { byPriority, isInUse, toCss, toSelector } from './styles';
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
