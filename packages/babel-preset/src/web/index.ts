import { BabelFile, BabelFileMetadata, BabelFileResult, NodePath } from '@babel/core';
import { Function } from '@babel/types';

import { Context } from '../context';
import Plugin from '../plugin';
import { componentProp, componentProps } from '../syntax/component';
import { hasProp, spreadProps } from '../syntax/jsx';
import t from '../types';
import { addClassName, fixTagName, getClassName } from './jsx';
import * as Macros from './macros';
import { byPriority, isInUse, toCss } from './styles';

namespace Preset {
  export interface Options extends Plugin.Options {}
  export interface Meta extends BabelFileMetadata {
    css: string;
  }
  export interface Result extends BabelFileResult {
    metadata: Meta;
    code: string;
  }
  export interface MetaData {
    readonly css: string;
    styles: Set<Context>;
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

          let forward: NodePath<Function> | undefined;
       
          for(const define of used){
            const className = getClassName(define);

            if(className)
              addClassName(path, className, polyfill);

            if(define.path.isFunction())
              forward = define.path;
          }

          for(const context of used){
            context.children.forEach(x => used.add(x));
            (path.hub as any).file.metadata.styles.add(context);
          }

          if(forward){
            spreadProps(path, componentProps(forward));

            if(hasProp(path, "className"))
              addClassName(path, componentProp(path, "className"), polyfill)
          }

          fixTagName(path);
        },
      }],
      [{
        pre(file: BabelFile){
          Object.defineProperties(file.metadata, {
            styles: {
              enumerable: true,
              value: styles
            },
            css: {
              enumerable: true,
              get(this: Preset.MetaData){
                return Array
                  .from(this.styles)
                  .filter(isInUse)
                  .sort(byPriority)
                  .map(toCss)
                  .join("\n");
              }
            }
          })
        }
      }]
    ]
  }
}

export default Preset;